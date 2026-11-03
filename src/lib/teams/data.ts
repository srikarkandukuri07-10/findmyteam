import "server-only";
import { z } from "zod";
import { requireUser } from "@/lib/auth/dal";

const positionSchema = z.object({ role: z.string(), spots: z.number() });
const listMemberSchema = z.object({ id: z.string(), name: z.string() });
const memberSchema = z.object({
  id: z.string(),
  name: z.string(),
  is_owner: z.boolean(),
  college: z.string().nullable(),
  year: z.number(),
  roles: z.array(z.string()),
});

export type RecruitStatus = "open" | "partially_filled" | "full" | "closed";

export const RECRUIT_LABELS: Record<RecruitStatus, string> = {
  open: "Looking for members",
  partially_filled: "A few spots left",
  full: "Full",
  closed: "Closed",
};

export type TeamSummary = {
  id: string;
  name: string;
  description: string | null;
  hackathonId: string;
  hackathonName: string;
  hackathonStartsOn: string;
  status: RecruitStatus;
  memberCount: number;
  members: z.infer<typeof listMemberSchema>[];
  positions: z.infer<typeof positionSchema>[];
  isDemo: boolean;
};

export type TeamDetail = Omit<TeamSummary, "members" | "memberCount" | "hackathonStartsOn"> & {
  idea: string | null;
  hackathonStartsOn: string;
  hackathonEndsOn: string;
  members: z.infer<typeof memberSchema>[];
};

export async function listTeams(hackathonId?: string): Promise<TeamSummary[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("list_teams", hackathonId ? { p_hackathon: hackathonId } : {});
  if (error) throw error;
  return data.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    hackathonId: t.hackathon_id,
    hackathonName: t.hackathon_name,
    hackathonStartsOn: t.hackathon_starts_on,
    status: t.recruit_status,
    memberCount: t.member_count,
    members: z.array(listMemberSchema).catch([]).parse(t.members),
    positions: z.array(positionSchema).catch([]).parse(t.positions),
    isDemo: t.is_demo,
  }));
}

export async function getTeam(id: string): Promise<TeamDetail | null> {
  if (!z.uuid().safeParse(id).success) return null;
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("get_team", { p_id: id });
  if (error) throw error;
  const t = data[0];
  if (!t) return null;
  return {
    id: t.id,
    name: t.name,
    description: t.description,
    idea: t.idea,
    hackathonId: t.hackathon_id,
    hackathonName: t.hackathon_name,
    hackathonStartsOn: t.hackathon_starts_on,
    hackathonEndsOn: t.hackathon_ends_on,
    status: t.recruit_status,
    members: z.array(memberSchema).catch([]).parse(t.members),
    positions: z.array(positionSchema).catch([]).parse(t.positions),
    isDemo: t.is_demo,
  };
}
