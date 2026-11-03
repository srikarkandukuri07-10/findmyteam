"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/dal";
import { CONSENT_VERSION, fieldErrors, onboardingSchema } from "@/lib/validation/auth";
import type { FormState } from "@/app/(auth)/actions";

const FIELDS = [
  "displayName",
  "degree",
  "collegeId",
  "collegeOther",
  "branchId",
  "yearOfStudy",
  "graduationYear",
  "birthYear",
  "confirmDegree",
  "acceptTerms",
] as const;

/** AUTH-7: B.Tech / B.E. declaration and consent, saved in one database call. */
export async function completeOnboarding(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw: Record<string, string | undefined> = {};
  for (const key of FIELDS) {
    const v = formData.get(key);
    raw[key] = typeof v === "string" ? v : undefined;
  }
  const values = Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== undefined)) as Record<string, string>;

  const parsed = onboardingSchema().safeParse(raw);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  const input = parsed.data;

  const listed = input.collegeId !== "other";
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("complete_onboarding", {
    p_display_name: input.displayName,
    p_degree: input.degree,
    // The function takes SQL nulls for "not given"; generated types don't mark args nullable.
    p_college_id: (listed ? input.collegeId : null) as number,
    p_college_other: (listed ? null : input.collegeOther) as string,
    p_branch_id: input.branchId,
    p_year_of_study: input.yearOfStudy,
    p_graduation_year: input.graduationYear,
    p_birth_year: input.birthYear,
    p_consent_version: CONSENT_VERSION,
  });

  if (error && !error.message.includes("already_onboarded")) {
    return { values, message: { ok: false, text: "Couldn't save your details. Check them and try again." } };
  }

  redirect("/home");
}
