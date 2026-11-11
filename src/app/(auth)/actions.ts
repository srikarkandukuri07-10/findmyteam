"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath, siteUrl } from "@/lib/site-url";
import { devPasswordSignInAllowed } from "@/lib/auth/dev";
import { z } from "zod";
import { fieldErrors, logInSchema } from "@/lib/validation/auth";
import { EARLY_ACCESS_ONLY_MESSAGE, hasEarlyAccess, isWaitlistMode } from "@/lib/waitlist/mode";

export type FormState = {
  errors?: Record<string, string>;
  /** Shown above the form; `ok` decides the colour. */
  message?: { ok: boolean; text: string };
  /** Non-secret values echoed back so the form keeps them after a failed submit. */
  values?: Record<string, string>;
};

function str(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

export type CodeState = {
  step: "email" | "code";
  email?: string;
  /** Shown above the form; `ok` decides the colour. */
  message?: { ok: boolean; text: string };
};

const emailField = z.string().trim().toLowerCase().max(254).pipe(z.email({ error: "Enter a valid email address." }));
const codeField = z.string().trim().regex(/^\d{6,10}$/, { error: "Enter the code from the email." });

function codeErrorText(code: string | undefined) {
  switch (code) {
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Too many codes asked for. Wait a minute and try again.";
    case "otp_expired":
      return "That code has expired or isn't right. Ask for a new one.";
    case "signup_disabled":
    case "otp_disabled":
      return isWaitlistMode() ? EARLY_ACCESS_ONLY_MESSAGE : "New sign-ups aren't open right now. Try again soon.";
    default:
      return "Couldn't send the code. Check the email and try again.";
  }
}

/** Marks the account as email-verified (D27) and refreshes the token so the mark is in it. */
async function markEmailVerified(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase.rpc("confirm_email_code");
  if (data) await supabase.auth.refreshSession();
  return Boolean(data);
}

/**
 * AUTH-1, AUTH-2 (D27): sign up or log in with just an email. A 6-digit code is emailed; no password.
 * New accounts are created only when sign-ups are open (not during the pre-launch lock).
 */
export async function sendEmailCode(_prev: CodeState, formData: FormData): Promise<CodeState> {
  const email = emailField.safeParse(str(formData, "email"));
  if (!email.success) return { step: "email", message: { ok: false, text: email.error.issues[0]?.message ?? "Enter a valid email address." } };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: email.data,
    options: { shouldCreateUser: !isWaitlistMode() },
  });
  if (error) return { step: "email", email: email.data, message: { ok: false, text: codeErrorText(error.code) } };
  return { step: "code", email: email.data, message: { ok: true, text: `We sent a code to ${email.data}. It expires in 10 minutes.` } };
}

export async function verifyEmailCode(_prev: CodeState, formData: FormData): Promise<CodeState> {
  const email = emailField.safeParse(str(formData, "email"));
  const code = codeField.safeParse(str(formData, "code"));
  if (!email.success) return { step: "email", message: { ok: false, text: "Enter your email again." } };
  if (!code.success) return { step: "code", email: email.data, message: { ok: false, text: code.error.issues[0]?.message ?? "Enter the code." } };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ email: email.data, token: code.data, type: "email" });
  if (error || !data.user) {
    return { step: "code", email: email.data, message: { ok: false, text: "That code isn't right or has expired. Check the email, or ask for a new code." } };
  }
  if (isWaitlistMode() && !hasEarlyAccess(data.user)) {
    await supabase.auth.signOut();
    return { step: "email", message: { ok: false, text: EARLY_ACCESS_ONLY_MESSAGE } };
  }
  // Never let someone in unless the mark is really set; otherwise they'd just loop back here.
  if (!(await markEmailVerified(supabase))) {
    await supabase.auth.signOut();
    return { step: "email", message: { ok: false, text: "We couldn't confirm your email. Please try again." } };
  }
  redirect(safeNextPath(str(formData, "next"), "/home"));
}

/** D27, after Google: email a code to the signed-in account's own address. */
export async function sendMyCode(): Promise<CodeState> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email;
  if (!email) redirect("/login");
  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
  if (error) return { step: "email", email, message: { ok: false, text: codeErrorText(error.code) } };
  return { step: "code", email, message: { ok: true, text: `We sent a code to ${email}. It expires in 10 minutes.` } };
}

export async function verifyMyCode(_prev: CodeState, formData: FormData): Promise<CodeState> {
  const supabase = await createClient();
  const { data: me } = await supabase.auth.getUser();
  const email = me.user?.email;
  if (!email) redirect("/login");
  const code = codeField.safeParse(str(formData, "code"));
  if (!code.success) return { step: "code", email, message: { ok: false, text: code.error.issues[0]?.message ?? "Enter the code." } };
  const { error } = await supabase.auth.verifyOtp({ email, token: code.data, type: "email" });
  if (error) {
    return { step: "code", email, message: { ok: false, text: "That code isn't right or has expired. Check the email, or ask for a new code." } };
  }
  if (!(await markEmailVerified(supabase))) {
    return { step: "code", email, message: { ok: false, text: "We couldn't confirm your email. Ask for a new code and try again." } };
  }
  redirect(safeNextPath(str(formData, "next"), "/home"));
}

/**
 * AUTH-1 (D25): Google is one way to sign in or sign up (the other is an email code, D27). Supabase sends the student to Google
 * and back to /auth/confirm, which finishes the sign-in and applies the pre-launch lock.
 */
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

/** Local development only (D25): sign in to the seeded test accounts, which have no Google account. */
export async function devLogIn(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!devPasswordSignInAllowed()) return { message: { ok: false, text: "Sign in with Google." } };
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
