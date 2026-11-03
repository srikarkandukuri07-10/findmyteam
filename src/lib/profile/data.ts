import "server-only";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/dal";
import { SKILL_LEVELS } from "@/lib/validation/profile";
import { profileCompleteness } from "./completeness";

const profileSkillSchema = z.object({
  id: z.number(),
  name: z.string(),
  category: z.enum(["technical", "non_technical"]),
  level: z.enum(SKILL_LEVELS),
});
const profileRoleSchema = z.object({ id: z.number(), name: z.string() });

export type ProfileSkill = z.infer<typeof profileSkillSchema>;

/** Another student's profile as the database exposes it: no birth year, consent data or status. */
export async function getProfileView(id: string) {
  if (!z.uuid().safeParse(id).success) notFound();
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("get_profile", { p_id: id });
  if (error) throw error;
  const row = data[0];
  if (!row) notFound();

  return {
    id: row.id,
    displayName: row.display_name,
    bio: row.bio,
    githubUsername: row.github_username,
    linkedinUrl: row.linkedin_url,
    degree: row.degree,
    collegeName: row.college_name,
    branchName: row.branch_name,
    yearOfStudy: row.year_of_study,
    graduationYear: row.graduation_year,
    skills: z.array(profileSkillSchema).parse(row.skills),
    roles: z.array(profileRoleSchema).parse(row.roles),
    isMe: row.is_me,
  };
}

export type ProfileView = Awaited<ReturnType<typeof getProfileView>>;

/** Everything the edit form needs: my current values plus the pick-lists. */
export async function getProfileForEdit() {
  const { supabase, userId } = await requireUser();
  const [profile, mySkills, myRoles, skills, roles, branches] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, bio, github_username, linkedin_url, branch_id, year_of_study, graduation_year")
      .eq("id", userId)
      .single(),
    supabase.from("profile_skills").select("skill_id, level"),
    supabase.from("profile_roles").select("role_id"),
    supabase.from("skills").select("id, name, category").order("sort_order"),
    supabase.from("roles").select("id, name").order("sort_order"),
    supabase.from("branches").select("id, name").order("sort_order"),
  ]);
  for (const r of [profile, mySkills, myRoles, skills, roles, branches]) if (r.error) throw r.error;

  return {
    profile: profile.data!,
    selectedSkills: mySkills.data!.map((s) => ({ id: s.skill_id, level: s.level })),
    selectedRoleIds: myRoles.data!.map((r) => r.role_id),
    skills: skills.data!,
    roles: roles.data!,
    branches: branches.data!,
  };
}

/** Completeness of my own profile (RLS limits every query below to my rows). */
export async function getMyCompleteness() {
  const { supabase, userId } = await requireUser();
  const [profile, skills, roles] = await Promise.all([
    supabase.from("profiles").select("bio, github_username, linkedin_url").eq("id", userId).single(),
    supabase.from("profile_skills").select("*", { count: "exact", head: true }),
    supabase.from("profile_roles").select("*", { count: "exact", head: true }),
  ]);
  for (const r of [profile, skills, roles]) if (r.error) throw r.error;

  return profileCompleteness({
    bio: profile.data!.bio,
    githubUsername: profile.data!.github_username,
    linkedinUrl: profile.data!.linkedin_url,
    skillCount: skills.count ?? 0,
    roleCount: roles.count ?? 0,
  });
}
