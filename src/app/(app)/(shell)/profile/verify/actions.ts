"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/dal";

export type VerifyState = { kind: "idle" } | { kind: "ok"; text: string; step: "code" | "done"; badge?: boolean } | { kind: "error"; text: string };

const START_TEXT: Record<string, string> = {
  invalid_email: "Enter a valid email address.",
  personal_email: "Use your college email, not a personal one like Gmail or Outlook.",
  already_verified: "This address is already confirmed on your account.",
  email_in_use: "This college email is already confirmed on another FindMyTeam account.",
  rate_limited: "You've asked for 3 codes in the last hour. Try again later.",
  daily_limit: "We've sent our limit of codes for today. Try again tomorrow.",
  send_failed: "Couldn't send the email. Check the address and try again.",
  email_not_configured: "Sending codes isn't switched on yet. Try again soon.",
};

const CONFIRM_TEXT: Record<string, string> = {
  no_request: "Ask for a new code first.",
  expired: "This code has expired. Ask for a new one.",
  locked: "Too many wrong tries. Ask for a new code.",
  wrong_code: "That code isn't right. Check the email and try again.",
  email_in_use: "This college email is already confirmed on another FindMyTeam account.",
};

const emailSchema = z.string().trim().toLowerCase().max(254).pipe(z.email("Enter a valid email address."));
const codeSchema = z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code from the email.");

/** D25 step 1: email a 6-digit code to the student's college address. */
export async function sendCollegeCode(_prev: VerifyState, formData: FormData): Promise<VerifyState> {
  const email = emailSchema.safeParse(formData.get("email") ?? "");
  if (!email.success) return { kind: "error", text: email.error.issues[0]?.message ?? "Enter a valid email address." };

  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("start_college_verification", { p_email: email.data });
  const result = error ? (error.message === "email_not_configured" ? error.message : "send_failed") : data;
  revalidatePath("/profile/verify");
  if (result === "sent") return { kind: "ok", step: "code", text: `We sent a 6-digit code to ${email.data}. It expires in 10 minutes.` };
  return { kind: "error", text: START_TEXT[result] ?? START_TEXT.send_failed };
}

/** D25 step 2: check the code. */
export async function confirmCollegeCode(_prev: VerifyState, formData: FormData): Promise<VerifyState> {
  const code = codeSchema.safeParse(formData.get("code") ?? "");
  if (!code.success) return { kind: "error", text: code.error.issues[0]?.message ?? "Enter the 6-digit code." };

  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("confirm_college_verification", { p_code: code.data });
  if (error) return { kind: "error", text: "Couldn't check the code. Try again." };
  if (data === "verified" || data === "pending_domain") revalidatePath("/", "layout");
  if (data === "verified") return { kind: "ok", step: "done", badge: true, text: "Done! You now have the Verified student badge." };
  if (data === "pending_domain") {
    return {
      kind: "ok",
      step: "done",
      text: "Email confirmed. Your college's email domain is new to us, so the badge appears once we've checked it belongs to your college.",
    };
  }
  return { kind: "error", text: CONFIRM_TEXT[data] ?? "Couldn't check the code. Try again." };
}

/** Removes the college address and the badge. */
export async function removeCollegeEmail(): Promise<{ ok: boolean }> {
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("remove_college_verification");
  revalidatePath("/", "layout");
  return { ok: !error };
}
