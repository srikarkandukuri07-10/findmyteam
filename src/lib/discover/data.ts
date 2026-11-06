import "server-only";
import { z } from "zod";
import { requireUser } from "@/lib/auth/dal";
import { verifiedStudentIds } from "@/lib/profile/verified";
import { SKILL_LEVELS } from "@/lib/validation/profile";

const skillSchema = z.object({
  id: z.number(),
  name: z.string(),
  category: z.enum(["technical", "non_technical"]),
  level: z.enum(SKILL_LEVELS),
});
const roleSchema = z.object({ id: z.number(), name: z.string() });
const githubSchema = z
  .object({
    login: z.string(),
    public_repos: z.number(),
    followers: z.number(),
    contributions_total: z.number(),
    top_language: z.string().nullable(),
  })
  .nullable();

export type DiscoverCandidate = {
  id: string;
  name: string;
  bio: string | null;
  degree: "btech" | "be";
  college: string | null;
  branch: string | null;
  year: number;
  graduationYear: number;
  skills: z.infer<typeof skillSchema>[];
  roles: z.infer<typeof roleSchema>[];
  github: z.infer<typeof githubSchema>;
  githubVerified: boolean;
  collegeVerified: boolean;
  isDemo: boolean;
  reason: string;
  avatarPath: string | null;
};

/** The next students to show, best matches first. Skipped, requested and blocked students are left out. */
export async function getDiscoverCandidates(limit = 20): Promise<DiscoverCandidate[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("discover_people", { p_limit: limit });
  if (error) throw error;
  const verified = await verifiedStudentIds(supabase, data.map((row) => row.id));

  return data.map((row) => ({
    id: row.id,
    name: row.display_name,
    bio: row.bio,
    degree: row.degree,
    college: row.college_name,
    branch: row.branch_name,
    year: row.year_of_study,
    graduationYear: row.graduation_year,
    skills: z.array(skillSchema).catch([]).parse(row.skills),
    roles: z.array(roleSchema).catch([]).parse(row.roles),
    github: githubSchema.catch(null).parse(row.github),
    githubVerified: row.github_verified,
    collegeVerified: verified.has(row.id),
    isDemo: row.is_demo,
    reason: row.reason,
    avatarPath: row.avatar_path,
  }));
}

export async function getConnectsLeft() {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("my_connects_left");
  if (error) throw error;
  return data;
}
