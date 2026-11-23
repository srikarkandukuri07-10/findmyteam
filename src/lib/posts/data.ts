import "server-only";
import { z } from "zod";
import { requireUser } from "@/lib/auth/dal";
import type { HackathonPreview } from "@/lib/hackathon/extract";
import { listMyTeams } from "@/lib/teams/data";

const text = z.string().nullable().catch(null);
/** The stored summary is shown as plain text only, and any field of it may be missing. */
const previewSchema = z.object({
  url: z.string(),
  host: z.string(),
  name: text,
  summary: text,
  about: text,
  startsOn: text,
  endsOn: text,
  datesText: text,
  mode: z.enum(["online", "offline", "hybrid"]).nullable().catch(null),
  location: text,
  prizes: text,
  teamSize: text,
});

const teamSchema = z.object({
  id: z.string(),
  hackathon_name: z.string(),
  mode: z.string(),
  team_size: z.number(),
  member_count: z.number(),
  looking_for: z.string(),
  recruiting: z.boolean(),
  is_member: z.boolean(),
});

export type PostTeam = {
  id: string;
  hackathonName: string;
  mode: string;
  teamSize: number;
  memberCount: number;
  lookingFor: string;
  recruiting: boolean;
  isMember: boolean;
};

export type PostView = {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarPath: string | null;
  /** College, branch and year on one line. */
  authorLine: string;
  body: string;
  linkUrl: string | null;
  preview: HackathonPreview | null;
  imageUrl: string | null;
  createdAt: string;
  isMine: boolean;
  connection: "self" | "none" | "pending" | "connected";
  team: PostTeam | null;
};

/** D33: the live posts, newest first. */
export async function listPosts(limit = 20): Promise<PostView[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("list_posts", { p_limit: limit });
  if (error) throw error;
  return data.map((p) => {
    const team = teamSchema.safeParse(p.team);
    const preview = previewSchema.safeParse(p.link_preview);
    return {
      id: p.id,
      authorId: p.author_id,
      authorName: p.author_name,
      authorAvatarPath: p.author_avatar_path,
      authorLine: [p.author_college, p.author_branch, p.author_year ? `Year ${p.author_year}` : null].filter(Boolean).join(" · "),
      body: p.body,
      linkUrl: p.link_url && /^https?:\/\//i.test(p.link_url) ? p.link_url : null,
      preview: preview.success ? preview.data : null,
      imageUrl: p.image_path ? supabase.storage.from("post-images").getPublicUrl(p.image_path).data.publicUrl : null,
      createdAt: p.created_at,
      isMine: p.is_mine,
      connection: (["self", "pending", "connected"] as const).find((c) => c === p.connection) ?? "none",
      team: team.success
        ? {
            id: team.data.id,
            hackathonName: team.data.hackathon_name,
            mode: team.data.mode,
            teamSize: team.data.team_size,
            memberCount: team.data.member_count,
            lookingFor: team.data.looking_for,
            recruiting: team.data.recruiting,
            isMember: team.data.is_member,
          }
        : null,
    };
  });
}

/** My teams that are still recruiting: the ones a post can point to. */
export async function listPostableTeams(): Promise<{ id: string; name: string }[]> {
  const teams = await listMyTeams();
  return teams
    .filter((t) => !t.completed && (t.recruitStatus === "open" || t.recruitStatus === "partially_filled"))
    .map((t) => ({ id: t.id, name: t.hackathonName }));
}
