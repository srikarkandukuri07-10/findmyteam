"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath, siteUrl } from "@/lib/site-url";
import { devPasswordSignInAllowed } from "@/lib/auth/dev";
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

/**
 * AUTH-1 (D25): Google is the only way to sign in or sign up. Supabase sends the student to Google
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
