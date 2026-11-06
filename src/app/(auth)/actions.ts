"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath, siteUrl } from "@/lib/site-url";
import {
  fieldErrors,
  forgotPasswordSchema,
  logInSchema,
  resetPasswordSchema,
  signUpSchema,
} from "@/lib/validation/auth";
import {
  EARLY_ACCESS_ONLY_MESSAGE,
  WAITLIST_LOCKED_MESSAGE,
  hasEarlyAccess,
  isWaitlistMode,
} from "@/lib/waitlist/mode";

/** Defence in depth for the pre-launch lock (D19, D24): proxy.ts already hides these pages. */
const LOCKED: FormState = { message: { ok: false, text: WAITLIST_LOCKED_MESSAGE } };

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

/** Supabase error codes -> wording a student understands. */
function authErrorText(code: string | undefined, fallback: string) {
  switch (code) {
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Too many attempts. Wait a few minutes and try again.";
    case "weak_password":
      return "Choose a stronger password.";
    case "invalid_credentials":
      return "Email or password is incorrect.";
    case "same_password":
      return "Choose a password different from your current one.";
    case "user_already_exists":
    case "email_exists":
      return "This email already has an account. Log in instead.";
    default:
      return fallback;
  }
}

/**
 * AUTH-1: email + password. Email verification (AUTH-2) is switched off for now (DECISIONS D15):
 * with "Confirm email" off in Supabase, signUp returns a session and the student goes straight
 * to onboarding. If it is switched back on, no session comes back and the "check your email"
 * message below is shown, so nothing here needs to change.
 */
export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  if (isWaitlistMode()) return LOCKED;
  const values = { email: str(formData, "email") };
  const parsed = signUpSchema.safeParse({ email: values.email, password: str(formData, "password") });
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { emailRedirectTo: `${await siteUrl()}/auth/confirm?next=/onboarding` },
  });

  if (error) {
    return {
      values,
      message: { ok: false, text: authErrorText(error.code, "Couldn't create your account. Try again.") },
    };
  }

  if (data.session) redirect("/onboarding");

  // Verification is on: same reply whether or not the email already has an account, so accounts can't be probed.
  return {
    message: {
      ok: true,
      text: `Check ${parsed.data.email} for a verification link. Open it to finish signing up.`,
    },
  };
}

export async function logIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = { email: str(formData, "email") };
  const parsed = logInSchema.safeParse({ email: values.email, password: str(formData, "password") });
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };

  const supabase = await createClient();
  const { data: signedIn, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error?.code === "email_not_confirmed") {
    await supabase.auth.resend({
      type: "signup",
      email: parsed.data.email,
      options: { emailRedirectTo: `${await siteUrl()}/auth/confirm?next=/onboarding` },
    });
    return {
      values,
      message: { ok: false, text: "Verify your email first. We've sent you a new link." },
    };
  }
  if (error) {
    return { values, message: { ok: false, text: authErrorText(error.code, "Couldn't log you in. Try again.") } };
  }

  // Before launch (D24) only early-access accounts may stay signed in; everyone else is signed out again.
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

/** AUTH-6: password reset by email. */
export async function requestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  if (isWaitlistMode()) return LOCKED;
  const values = { email: str(formData, "email") };
  const parsed = forgotPasswordSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await siteUrl()}/auth/confirm?next=/reset-password`,
  });

  if (error?.code === "over_email_send_rate_limit" || error?.code === "over_request_rate_limit") {
    return { values, message: { ok: false, text: authErrorText(error.code, "") } };
  }

  // Same reply whether or not the account exists.
  return {
    message: { ok: true, text: `If ${parsed.data.email} has an account, a reset link is on its way.` },
  };
}

export async function resetPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = resetPasswordSchema.safeParse({
    password: str(formData, "password"),
    confirmPassword: str(formData, "confirmPassword"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/forgot-password");
  // Signed-in early-access accounts may change their password before launch (D24).
  if (isWaitlistMode() && !hasEarlyAccess(data.claims)) return LOCKED;

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return { message: { ok: false, text: authErrorText(error.code, "Couldn't update your password. Try again.") } };
  }

  redirect("/home");
}
