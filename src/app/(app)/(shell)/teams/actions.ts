"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/app/(auth)/actions";
import { requireUser } from "@/lib/auth/dal";
import { fieldErrors } from "@/lib/validation/common";
import { createTeamSchema, joinNoteSchema, MAX_ACTIVE_TEAMS } from "@/lib/validation/teams";

const uuid = z.uuid();
export type ActionResult = { ok: true } | { ok: false; error: string };

const MESSAGES: Record<string, string> = {
  team_limit: `You already lead ${MAX_ACTIVE_TEAMS} active teams. Mark one as completed to create another.`,
  rate_limited: "You've created a lot of teams today. Try again tomorrow.",
  invalid_hackathon_url: "Paste a full link to the hackathon, like https://sih.gov.in",
  team_not_found: "This team isn't available.",
  already_member: "You're already in this team.",
  sample_team: "This is a sample team, so it can't take requests.",
  not_recruiting: "This team isn't taking requests right now.",
  already_requested: "You've already asked to join. Wait for the lead to reply.",
  recently_declined: "The lead declined your request recently. You can ask again a week later.",
  too_many_requests: "You have 10 requests waiting. Withdraw one or wait for replies.",
  request_not_found: "That request is no longer there.",
  request_closed: "That request was already answered.",
  team_full: "The team is full. Raise the team size or remove someone first.",
  team_completed: "This team is marked as completed.",
  not_allowed: "Only the team lead can do that.",
  lead_cannot_leave: "As the lead you can't leave. Mark the team as completed instead.",
  not_a_member: "They're not in this team anymore.",
};

function fail(error: { message: string } | null): ActionResult {
  return { ok: false, error: MESSAGES[error?.message ?? ""] ?? "Something went wrong. Try again." };
}

function refresh(teamId?: string) {
  revalidatePath("/teams");
  if (teamId) revalidatePath(`/teams/${teamId}`);
  revalidatePath("/messages", "layout");
}

/** D29: create a team. Its group chat is created with it. */
export async function createTeam(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = {
    hackathonName: formData.get("hackathonName"),
    hackathonUrl: formData.get("hackathonUrl"),
    mode: formData.get("mode"),
    teamSize: formData.get("teamSize"),
    about: formData.get("about"),
    lookingFor: formData.get("lookingFor"),
  };
  const values = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, typeof v === "string" ? v : ""]));
  const parsed = createTeamSchema.safeParse(raw);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };

  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("create_team", {
    p_hackathon_name: parsed.data.hackathonName,
    p_hackathon_url: parsed.data.hackathonUrl,
    p_mode: parsed.data.mode,
    p_team_size: parsed.data.teamSize,
    p_about: parsed.data.about,
    p_looking_for: parsed.data.lookingFor,
  });
  if (error || !data) {
    const r = fail(error);
    return { message: { ok: false, text: r.ok ? "" : r.error }, values };
  }
  refresh();
  redirect(`/teams/${data}?created=1`);
}

export async function requestToJoin(teamId: string, note: string): Promise<ActionResult> {
  const team = uuid.safeParse(teamId);
  const text = joinNoteSchema.safeParse(note);
  if (!team.success) return { ok: false, error: MESSAGES.team_not_found };
  if (!text.success) return { ok: false, error: text.error.issues[0]?.message ?? "Check your note." };
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("request_to_join", { p_team: team.data, p_note: text.data || null });
  if (error) return fail(error);
  refresh(team.data);
  return { ok: true };
}

export async function withdrawRequest(teamId: string): Promise<ActionResult> {
  const team = uuid.safeParse(teamId);
  if (!team.success) return { ok: false, error: MESSAGES.team_not_found };
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("withdraw_join_request", { p_team: team.data });
  if (error) return fail(error);
  refresh(team.data);
  return { ok: true };
}

/** The lead accepts (they join the team and its chat at once) or declines. */
export async function decideRequest(teamId: string, requestId: string, accept: boolean): Promise<ActionResult> {
  const team = uuid.safeParse(teamId);
  const req = uuid.safeParse(requestId);
  if (!team.success || !req.success) return { ok: false, error: MESSAGES.request_not_found };
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("decide_join_request", { p_request: req.data, p_accept: accept === true });
  if (error) return fail(error);
  refresh(team.data);
  return { ok: true };
}

export async function removeMember(teamId: string, userId: string): Promise<ActionResult> {
  const team = uuid.safeParse(teamId);
  const user = uuid.safeParse(userId);
  if (!team.success || !user.success) return { ok: false, error: MESSAGES.not_a_member };
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("remove_team_member", { p_team: team.data, p_user: user.data });
  if (error) return fail(error);
  refresh(team.data);
  return { ok: true };
}

export async function leaveTeam(teamId: string): Promise<ActionResult> {
  const team = uuid.safeParse(teamId);
  if (!team.success) return { ok: false, error: MESSAGES.team_not_found };
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("leave_team", { p_team: team.data });
  if (error) return fail(error);
  refresh(team.data);
  return { ok: true };
}

export async function setRecruiting(teamId: string, open: boolean): Promise<ActionResult> {
  const team = uuid.safeParse(teamId);
  if (!team.success) return { ok: false, error: MESSAGES.team_not_found };
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("set_team_recruiting", { p_team: team.data, p_open: open === true });
  if (error) return fail(error);
  refresh(team.data);
  return { ok: true };
}

/** Frees one of the lead's 3 active-team slots. The chat stays. */
export async function completeTeam(teamId: string): Promise<ActionResult> {
  const team = uuid.safeParse(teamId);
  if (!team.success) return { ok: false, error: MESSAGES.team_not_found };
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("complete_team", { p_team: team.data });
  if (error) return fail(error);
  refresh(team.data);
  return { ok: true };
}
