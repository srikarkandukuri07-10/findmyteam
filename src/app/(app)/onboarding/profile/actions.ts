"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/dal";
import { saveProfileRpc } from "@/lib/profile/save";
import { fieldErrors } from "@/lib/validation/common";
import { profileSchema, rolesFromForm, skillsFromForm } from "@/lib/validation/profile";
import type { FormState } from "@/app/(auth)/actions";

/**
 * Last onboarding step: bio, skills and roles. The rest of the profile (name, studies, LinkedIn)
 * was captured earlier, so it is read back from the database and saved unchanged.
 */
export async function saveOnboardingProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const rawBio = formData.get("bio");
  const values = { bio: typeof rawBio === "string" ? rawBio : "" };

  const { supabase, userId } = await requireUser();
  const { data: current, error: readError } = await supabase
    .from("profiles")
    .select("display_name, linkedin_url, branch_id, year_of_study, graduation_year")
    .eq("id", userId)
    .single();
  if (readError) {
    return { values, message: { ok: false, text: "Couldn't load your details. Try again, or skip for now." } };
  }

  const parsed = profileSchema().safeParse({
    displayName: current.display_name,
    bio: values.bio,
    linkedinUrl: current.linkedin_url,
    branchId: current.branch_id,
    yearOfStudy: current.year_of_study,
    graduationYear: current.graduation_year,
    skills: skillsFromForm(formData.getAll("skill")),
    roleIds: rolesFromForm(formData.getAll("role")),
  });
  if (!parsed.success) {
    const errors = fieldErrors(parsed.error);
    // Only bio, skills and roles are editable here; anything else is shown as a general message.
    const known = ["bio", "skills", "roleIds"];
    const stray = Object.keys(errors).find((k) => !known.includes(k));
    return {
      values,
      errors,
      message: stray ? { ok: false, text: "Some of your saved details need fixing. Open your profile to update them." } : undefined,
    };
  }

  const { error } = await saveProfileRpc(supabase, parsed.data);
  if (error) {
    return { values, message: { ok: false, text: "Couldn't save your profile. Try again, or skip for now." } };
  }

  revalidatePath("/", "layout");
  redirect("/home");
}
