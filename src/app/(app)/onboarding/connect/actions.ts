"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/dal";
import { fieldErrors } from "@/lib/validation/common";
import { linkedinSchema } from "@/lib/validation/profile";
import type { FormState } from "@/app/(auth)/actions";

/** Optional second onboarding step: save the LinkedIn link (blank is fine) and go to the app. */
export async function saveLinkedinAndContinue(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = formData.get("linkedinUrl");
  const values = { linkedinUrl: typeof raw === "string" ? raw : "" };

  const parsed = linkedinSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };

  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("set_linkedin_url", { p_url: (parsed.data.linkedinUrl ?? null) as string });
  if (error) {
    return { values, message: { ok: false, text: "Couldn't save your LinkedIn link. Try again, or skip for now." } };
  }

  redirect("/home");
}
