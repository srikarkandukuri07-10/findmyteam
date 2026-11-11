"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import type { ResendResult, VerifyState } from "@/components/auth/code-step";
import { devPasswordSignInAllowed } from "@/lib/auth/dev";
import { clearPendingEmail, emailField, readPendingEmail, setPendingEmail } from "@/lib/auth/pending-email";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath, siteUrl } from "@/lib/site-url";
import { fieldErrors, logInSchema } from "@/lib/validation/auth";
import { EARLY_ACCESS_ONLY_MESSAGE, hasEarlyAccess, isWaitlistMode } from "@/lib/waitlist/mode";

export type FormState = {
  errors?: Record<string, string>;
  /** Shown above the form; `ok` decides the colour. */
  message?: { ok: boolean; text: string };
  /** Non-secret values echoed back so the form keeps them after a failed submit. */
  values?: Record<string, string>;
};

export type StartState = { error?: string; email?: string };

function str(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

// Supabase sends 6–10 digit codes depending on the OTP length setting (currently 8).
const codeField = z.string().trim().regex(/^\d{6,10}$/, { error: "Enter the full code from the email." });

function sendErrorText(code: string | undefined) {
  switch (code) {
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "A code was sent a moment ago. Check your inbox, or resend in a minute.";
    case "signup_disabled":
    case "otp_disabled":
      return isWaitlistMode() ? EARLY_ACCESS_ONLY_MESSAGE : "New sign-ups aren't open right now. Try again soon.";
    default:
      return "Couldn't send the code. Check the email and try again.";
  }
}

const WRONG_CODE = "That code isn't right or has expired. Check the latest email, or resend.";

/** Marks the account as email-verified (D27) and refreshes the token so the mark is in it. */
async function markEmailVerified(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase.rpc("confirm_email_code");
  if (data) await supabase.auth.refreshSession();
  return Boolean(data);
}

// ---------------------------------------------------------------------------------------------
// Email: /login -> code by email -> /login/code -> signed in. New emails get an account (AUTH-1, D27).
// ---------------------------------------------------------------------------------------------

export async function startEmailSignIn(_prev: StartState, formData: FormData): Promise<StartState> {
  const raw = str(formData, "email");
  const email = emailField.safeParse(raw);
  if (!email.success) return { email: raw, error: email.error.issues[0]?.message ?? "Enter a valid email address." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: email.data,
    options: { shouldCreateUser: !isWaitlistMode() },
  });
  if (error) return { email: raw, error: sendErrorText(error.code) };

  await setPendingEmail(email.data);
  const next = safeNextPath(str(formData, "next"), "");
  redirect(next ? `/login/code?next=${encodeURIComponent(next)}` : "/login/code");
}

export async function resendLoginCode(): Promise<ResendResult> {
  const email = await readPendingEmail();
  if (!email) return { ok: false, message: "Start again with your email." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: !isWaitlistMode() } });
  return error ? { ok: false, message: sendErrorText(error.code) } : { ok: true };
}

export async function verifyLoginCode(prev: VerifyState, formData: FormData): Promise<VerifyState> {
  const tries = (prev.tries ?? 0) + 1;
  const email = await readPendingEmail();
  if (!email) redirect("/login");
  const code = codeField.safeParse(str(formData, "code"));
  if (!code.success) return { tries, error: code.error.issues[0]?.message };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ email, token: code.data, type: "email" });
  if (error || !data.user) return { tries, error: WRONG_CODE };

  if (isWaitlistMode() && !hasEarlyAccess(data.user)) {
    await supabase.auth.signOut();
    return { tries, error: EARLY_ACCESS_ONLY_MESSAGE };
  }
  // Never let someone in unless the verified mark is really set; otherwise they'd loop back here.
  if (!(await markEmailVerified(supabase))) {
    await supabase.auth.signOut();
    return { tries, error: "We couldn't confirm your email. Resend the code and try again." };
  }
  await clearPendingEmail();
  redirect(safeNextPath(str(formData, "next"), "/home"));
}

// ---------------------------------------------------------------------------------------------
// Google: Google -> /auth/confirm -> first time only: /verify-email (code to that Gmail) -> in.
// ---------------------------------------------------------------------------------------------

export async function signInWithGoogle(formData: FormData) {
  const next = safeNextPath(str(formData, "next"), "/home");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${await siteUrl()}/auth/confirm?next=${encodeURIComponent(next)}`,
      queryParams: { prompt: "select_account" },
    },
  });
  if (error || !data.url) redirect("/login?error=failed");
  redirect(data.url);
}

/** After Google, the first time only: email a code to the signed-in account's own address. */
export async function sendMyCode(): Promise<ResendResult> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email;
  if (!email) redirect("/login");
  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
  return error ? { ok: false, message: sendErrorText(error.code) } : { ok: true };
}

export async function verifyMyCode(prev: VerifyState, formData: FormData): Promise<VerifyState> {
  const tries = (prev.tries ?? 0) + 1;
  const supabase = await createClient();
  const { data: me } = await supabase.auth.getUser();
  const email = me.user?.email;
  if (!email) redirect("/login");
  const code = codeField.safeParse(str(formData, "code"));
  if (!code.success) return { tries, error: code.error.issues[0]?.message };
  const { error } = await supabase.auth.verifyOtp({ email, token: code.data, type: "email" });
  if (error) return { tries, error: WRONG_CODE };
  if (!(await markEmailVerified(supabase))) {
    return { tries, error: "We couldn't confirm your email. Resend the code and try again." };
  }
  redirect(safeNextPath(str(formData, "next"), "/home"));
}

// ---------------------------------------------------------------------------------------------

/** Local development only (D25): sign in to the seeded test accounts, which have no inbox. */
export async function devLogIn(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!devPasswordSignInAllowed()) return { message: { ok: false, text: "Use Google or your email." } };
  const values = { email: str(formData, "email") };
  const parsed = logInSchema.safeParse({ email: values.email, password: str(formData, "password") });
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };

  const supabase = await createClient();
  const { data: signedIn, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { values, message: { ok: false, text: "Email or password is incorrect." } };

  if (isWaitlistMode() && !hasEarlyAccess(signedIn.user)) {
    await supabase.auth.signOut();
    return { values, message: { ok: false, text: EARLY_ACCESS_ONLY_MESSAGE } };
  }
  redirect(safeNextPath(str(formData, "next")));
}

export async function logOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
