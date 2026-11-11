import "server-only";
import { z } from "zod";
import { requireUser } from "@/lib/auth/dal";

export type RecruitStatus = "open" | "partially_filled" | "full" | "closed";
export type TeamMode = "online" | "offline";
export type RequestStatus = "pending" | "accepted" | "declined" | "withdrawn";

export const RECRUIT_LABELS: Record<RecruitStatus, string> = {
  open: "Looking for members",
  partially_filled: "Spots left",
  full: "Team full",
  closed: "Not recruiting",
};

export const MODE_LABELS: Record<TeamMode, string> = { online: "Online", offline: "Offline" };

const modeSchema = z.enum(["online", "offline"]).catch("online");
const requestStatusSchema = z.enum(["pending", "accepted", "declined", "withdrawn"]).nullable().catch(null);
const faceSchema = z.object({ id: z.string(), name: z.string(), avatar_path: z.string().nullable().catch(null) });
const memberSchema = faceSchema.extend({
  is_owner: z.boolean(),
  college: z.string().nullable().catch(null),
  year: z.number().nullable().catch(null),
  joined_at: z.string(),
  roles: z.array(z.string()).catch([]),
});
const requestSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  name: z.string(),
  avatar_path: z.string().nullable().catch(null),
  college: z.string().nullable().catch(null),
  year: z.number().nullable().catch(null),
  note: z.string().nullable().catch(null),
  created_at: z.string(),
  roles: z.array(z.string()).catch([]),
});

export type TeamFace = z.infer<typeof faceSchema>;
export type TeamMember = z.infer<typeof memberSchema>;
export type JoinRequest = z.infer<typeof requestSchema>;

export type BrowseTeam = {
  id: string;
  hackathonName: string;
  mode: TeamMode;
  teamSize: number;
  about: string;
  lookingFor: string;
  status: RecruitStatus;
  ownerName: string | null;
  memberCount: number;
  members: TeamFace[];
  isDemo: boolean;
  myRequest: RequestStatus | null;
};

export type MyTeam = {
  id: string;
  hackathonName: string;
  mode: TeamMode;
  teamSize: number;
  about: string;
  recruitStatus: RecruitStatus;
  completed: boolean;
  isOwner: boolean;
  memberCount: number;
  members: TeamFace[];
  pendingCount: number;
  conversationId: string | null;
  unread: number;
};

export type TeamDetail = {
  id: string;
  hackathonName: string;
  mode: TeamMode;
  teamSize: number;
  about: string;
  lookingFor: string;
  recruitStatus: RecruitStatus;
  completed: boolean;
  isDemo: boolean;
  createdAt: string;
  members: TeamMember[];
  isMember: boolean;
  isOwner: boolean;
  myRequest: RequestStatus | null;
  conversationId: string | null;
  requests: JoinRequest[];
};

/** D29: teams still looking for people, other than mine. */
export async function listTeams(): Promise<BrowseTeam[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("list_teams");
  if (error) throw error;
  return data.map((t) => ({
    id: t.id,
    hackathonName: t.hackathon_name,
    mode: modeSchema.parse(t.mode),
    teamSize: t.team_size,
    about: t.about,
    lookingFor: t.looking_for,
    status: t.recruit_status,
    ownerName: t.owner_name,
    memberCount: t.member_count,
    members: z.array(faceSchema).catch([]).parse(t.members),
    isDemo: t.is_demo,
    myRequest: requestStatusSchema.parse(t.my_request),
  }));
}

/** D29: teams I lead or belong to, active ones first. */
export async function listMyTeams(): Promise<MyTeam[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("list_my_teams");
  if (error) throw error;
  return data.map((t) => ({
    id: t.id,
    hackathonName: t.hackathon_name,
    mode: modeSchema.parse(t.mode),
    teamSize: t.team_size,
    about: t.about,
    recruitStatus: t.recruit_status,
    completed: t.status === "completed",
    isOwner: t.is_owner,
    memberCount: t.member_count,
    members: z.array(faceSchema).catch([]).parse(t.members),
    pendingCount: t.pending_count,
    conversationId: t.conversation_id,
    unread: t.unread ?? 0,
  }));
}

export type SentRequest = {
  teamId: string;
  hackathonName: string;
  ownerName: string | null;
  status: RequestStatus;
  createdAt: string;
};

export async function listMyJoinRequests(): Promise<SentRequest[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("list_my_join_requests");
  if (error) throw error;
  return data.map((r) => ({
    teamId: r.team_id,
    hackathonName: r.hackathon_name,
    ownerName: r.owner_name,
    status: requestStatusSchema.parse(r.status) ?? "pending",
    createdAt: r.created_at,
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
    hackathonName: t.hackathon_name,
    mode: modeSchema.parse(t.mode),
    teamSize: t.team_size,
    about: t.about,
    lookingFor: t.looking_for,
    recruitStatus: t.recruit_status,
    completed: t.status === "completed",
    isDemo: t.is_demo,
    createdAt: t.created_at,
    members: z.array(memberSchema).catch([]).parse(t.members),
    isMember: t.is_member,
    isOwner: Boolean(t.is_owner),
    myRequest: requestStatusSchema.parse(t.my_request),
    conversationId: t.conversation_id,
    requests: z.array(requestSchema).catch([]).parse(t.requests),
  };
}
