"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/dal";
import type { HackathonPreview } from "@/lib/hackathon/extract";
import { readHackathon } from "@/lib/hackathon/read";
import { normalizeLinkUrl } from "@/lib/hackathon/url";
import type { Json } from "@/lib/supabase/database.types";

const uuid = z.uuid();

export type PreviewResult =
  | { ok: true; url: string; preview: HackathonPreview | null }
  | { ok: false; error: string };

/** D33: reads a pasted hackathon link and summarises it, for the preview in the composer. */
export async function previewLink(rawUrl: string): Promise<PreviewResult> {
  const url = normalizeLinkUrl(rawUrl);
  if (!url) return { ok: false, error: "That doesn't look like a web link." };
  const { supabase } = await requireUser();
  const { data: allowed } = await supabase.rpc("take_link_preview_quota");
  if (!allowed) return { ok: false, error: "You've checked a lot of links today. Try again tomorrow." };
  return { ok: true, url, preview: await readHackathon(url) };
}

const createSchema = z.object({
  body: z.string().max(20000, "That's too long to post.").default(""),
  linkUrl: z.string().optional(),
  teamId: uuid.optional(),
  imagePath: z.string().max(200).optional(),
});

const MESSAGES: Record<string, string> = {
  rate_limited: "You've posted 5 times today. Try again tomorrow.",
  empty_post: "Write something, or add a link or a photo.",
  invalid_link: "That link doesn't look right.",
  invalid_team: "You can only attach a team you're in that's still active.",
  invalid_image: "That photo couldn't be used. Try another.",
};

export type PostResult = { ok: true } | { ok: false; error: string };

/**
 * Publishes a post. The hackathon summary is read here, on the server, from the link, so it comes from the
 * event page itself and not from the browser.
 */
export async function createPost(input: z.input<typeof createSchema>): Promise<PostResult> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check your post." };
  const { body, teamId, imagePath } = parsed.data;
  const linkUrl = parsed.data.linkUrl?.trim() ? normalizeLinkUrl(parsed.data.linkUrl) : null;
  if (parsed.data.linkUrl?.trim() && !linkUrl) return { ok: false, error: MESSAGES.invalid_link };

  const { supabase } = await requireUser();
  let preview: HackathonPreview | null = null;
  if (linkUrl) {
    const { data: allowed } = await supabase.rpc("take_link_preview_quota");
    if (allowed) preview = await readHackathon(linkUrl); // a failed read only means the link shows without a summary
  }

  const { error } = await supabase.rpc("create_post", {
    p_body: body,
    p_link_url: linkUrl,
    p_link_preview: preview as unknown as Json | null,
    p_image_path: imagePath ?? null,
    p_team_id: teamId ?? null,
  });
  if (error) return { ok: false, error: MESSAGES[error.message] ?? "Couldn't post. Try again." };
  revalidatePath("/home");
  return { ok: true };
}

export async function deletePost(postId: string): Promise<PostResult> {
  const id = uuid.safeParse(postId);
  if (!id.success) return { ok: false, error: "That post isn't available." };
  const { supabase } = await requireUser();
  const { data: imagePath, error } = await supabase.rpc("delete_post", { p_id: id.data });
  if (error) return { ok: false, error: "You can only delete your own posts." };
  if (imagePath) await supabase.storage.from("post-images").remove([imagePath]);
  revalidatePath("/home");
  return { ok: true };
}

const REASONS = ["spam", "harassment", "fake_profile", "inappropriate", "other"] as const;

export async function reportPost(postId: string, reason: (typeof REASONS)[number], details: string): Promise<PostResult> {
  const id = uuid.safeParse(postId);
  const why = z.enum(REASONS).safeParse(reason);
  if (!id.success || !why.success) return { ok: false, error: "Pick a reason." };
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("report_post", { p_post: id.data, p_reason: why.data, p_details: details.slice(0, 600) || null });
  if (error) return { ok: false, error: error.message === "rate_limited" ? "You've sent a lot of reports today." : "Couldn't send the report." };
  return { ok: true };
}
