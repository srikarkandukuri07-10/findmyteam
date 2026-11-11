"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/dal";
import { CONSENT_VERSION } from "@/lib/validation/auth";
import { fieldErrors } from "@/lib/validation/common";
import { detailsSchema } from "@/lib/validation/onboarding";
import type { FormState } from "@/app/(auth)/actions";

const FIELDS = [
  "displayName",
  "phone",
  "college",
  "degree",
  "branchId",
  "yearOfStudy",
  "graduationYear",
  "birthYear",
  "confirmDegree",
  "acceptTerms",
] as const;

const DB_ERRORS: Record<string, [string, string]> = {
  invalid_phone: ["phone", "Enter a valid 10-digit Indian mobile number."],
  phone_in_use: ["phone", "This number is already used by another FindMyTeam account."],
  invalid_college: ["college", "Enter your college or university name."],
};

/** D26 Card 1: you and your college. Saved in one database call; onboarding continues on Card 2. */
export async function saveDetails(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw: Record<string, string | undefined> = {};
  for (const key of FIELDS) {
    const v = formData.get(key);
    raw[key] = typeof v === "string" ? v : undefined;
  }
  const values = Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== undefined)) as Record<string, string>;

  const parsed = detailsSchema().safeParse(raw);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  const input = parsed.data;

  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("save_onboarding_details", {
    p_display_name: input.displayName,
    p_phone: input.phone,
    p_college: input.college,
    p_degree: input.degree,
    p_branch_id: input.branchId,
    p_year_of_study: input.yearOfStudy,
    p_graduation_year: input.graduationYear,
    p_birth_year: input.birthYear,
    p_consent_version: CONSENT_VERSION,
  });

  if (error && !error.message.includes("already_onboarded")) {
    const known = DB_ERRORS[error.message];
    if (known) return { values, errors: { [known[0]]: known[1] } };
    return { values, message: { ok: false, text: "Couldn't save your details. Check them and try again." } };
  }

  revalidatePath("/onboarding", "layout");
  redirect("/onboarding/profile");
}
