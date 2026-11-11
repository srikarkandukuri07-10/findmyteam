"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/dal";
import { fieldErrors } from "@/lib/validation/common";
import { greatAtSchema } from "@/lib/validation/onboarding";
import { rolesFromForm, skillsFromForm } from "@/lib/validation/profile";
import type { FormState } from "@/app/(auth)/actions";

/** D26 Card 2: skills (3+), interests, roles and bio (required). Finishing it finishes onboarding. */
export async function saveGreatAt(_prev: FormState, formData: FormData): Promise<FormState> {
  const rawBio = formData.get("bio");
  const values = { bio: typeof rawBio === "string" ? rawBio : "" };

  const parsed = greatAtSchema.safeParse({
    bio: values.bio,
    skills: skillsFromForm(formData.getAll("skill")),
    roleIds: rolesFromForm(formData.getAll("role")),
    interests: formData.getAll("interest").filter((v): v is string => typeof v === "string"),
  });
  if (!parsed.success) return { values, errors: fieldErrors(parsed.error) };

  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("complete_onboarding_profile", {
    p_bio: parsed.data.bio,
    p_skills: parsed.data.skills,
    p_role_ids: parsed.data.roleIds,
    p_interests: parsed.data.interests,
  });
  if (error) {
    if (error.message === "details_required") redirect("/onboarding");
    return { values, message: { ok: false, text: "Couldn't save this step. Check it and try again." } };
  }

  revalidatePath("/", "layout");
  redirect("/onboarding/connect");
}
