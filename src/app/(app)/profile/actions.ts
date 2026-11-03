"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/dal";
import { fieldErrors } from "@/lib/validation/common";
import { profileSchema, rolesFromForm, skillsFromForm } from "@/lib/validation/profile";
import type { FormState } from "@/app/(auth)/actions";

const TEXT_FIELDS = ["displayName", "bio", "githubUsername", "linkedinUrl", "branchId", "yearOfStudy", "graduationYear"] as const;

/** PROF-1, PROF-2, PROF-8: save my profile in one database call. */
export async function saveProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const values: Record<string, string> = {};
  for (const key of TEXT_FIELDS) {
    const v = formData.get(key);
    if (typeof v === "string") values[key] = v;
  }

  const parsed = profileSchema().safeParse({
    ...values,
    skills: skillsFromForm(formData.getAll("skill")),
    roleIds: rolesFromForm(formData.getAll("role")),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  const input = parsed.data;

  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("save_profile", {
    p_display_name: input.displayName,
    p_bio: (input.bio ?? null) as string,
    p_github_username: (input.githubUsername ?? null) as string,
    p_linkedin_url: (input.linkedinUrl ?? null) as string,
    p_branch_id: input.branchId,
    p_year_of_study: input.yearOfStudy,
    p_graduation_year: input.graduationYear,
    p_skills: input.skills,
    p_role_ids: input.roleIds,
  });

  if (error) {
    return { values, message: { ok: false, text: "Couldn't save your profile. Check your details and try again." } };
  }

  revalidatePath("/", "layout");
  redirect("/profile");
}
