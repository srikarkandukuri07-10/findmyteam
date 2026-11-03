import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { ProfileInput } from "@/lib/validation/profile";

/** Writes a validated profile through the one database function that does it atomically. */
export async function saveProfileRpc(supabase: SupabaseClient<Database>, input: ProfileInput) {
  return supabase.rpc("save_profile", {
    p_display_name: input.displayName,
    p_bio: (input.bio ?? null) as string,
    p_linkedin_url: (input.linkedinUrl ?? null) as string,
    p_branch_id: input.branchId,
    p_year_of_study: input.yearOfStudy,
    p_graduation_year: input.graduationYear,
    p_skills: input.skills,
    p_role_ids: input.roleIds,
  });
}
