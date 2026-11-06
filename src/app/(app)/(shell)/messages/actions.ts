"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/dal";

const id = z.uuid();
const bodySchema = z.string().trim().min(1, "Write a message first.").max(2000, "Keep it under 2,000 characters.");
const reportSchema = z.object({
  reason: z.enum(["spam", "harassment", "fake_profile", "inappropriate", "other"]),
  details: z.string().trim().max(1000).optional().default(""),
});

/** MSG-1: open the chat with a connection (creating it the first time), then go there. */
export async function openChatWith(otherId: string) {
  const parsed = id.safeParse(otherId);
  if (!parsed.success) redirect("/messages");
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("open_conversation", { p_other: parsed.data });
  if (error || !data) redirect(`/students/${parsed.data}?chat=unavailable`);
  redirect(`/messages/${data}`);
}

export type SendResult = { ok: true; id: number; createdAt: string } | { ok: false; error: string };

/** MSG-3, MSG-4: send a text message (links allowed). */
export async function sendMessage(conversationId: string, body: string): Promise<SendResult> {
  const conv = id.safeParse(conversationId);
  const text = bodySchema.safeParse(body);
  if (!conv.success) return { ok: false, error: "This conversation isn't available." };
  if (!text.success) return { ok: false, error: text.error.issues[0]?.message ?? "Check your message." };

  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("send_message", { p_conversation: conv.data, p_body: text.data });
  if (error || !data?.[0]) {
    const known: Record<string, string> = {
      blocked: "You can't message this person.",
      not_connected: "You're no longer connected, so you can't send messages here.",
      rate_limited: "You're sending too fast. Wait a moment.",
    };
    return { ok: false, error: known[error?.message ?? ""] ?? "Couldn't send. Try again." };
  }
  return { ok: true, id: data[0].id, createdAt: data[0].created_at };
}

export async function markRead(conversationId: string) {
  const conv = id.safeParse(conversationId);
  if (!conv.success) return;
  const { supabase } = await requireUser();
  await supabase.rpc("mark_conversation_read", { p_conversation: conv.data });
}

/** MSG-7 */
export async function setMuted(conversationId: string, muted: boolean): Promise<{ ok: boolean }> {
  const conv = id.safeParse(conversationId);
  if (!conv.success) return { ok: false };
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("set_conversation_muted", { p_conversation: conv.data, p_muted: muted });
  revalidatePath("/messages");
  return { ok: !error };
}

/** MSG-5: blocking ends the connection and stops both sides from sending or reading. */
export async function blockPerson(otherId: string): Promise<{ ok: boolean }> {
  const parsed = id.safeParse(otherId);
  if (!parsed.success) return { ok: false };
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("block_user", { p_other: parsed.data });
  revalidatePath("/messages");
  return { ok: !error };
}

export async function reportPerson(
  otherId: string,
  conversationId: string | null,
  input: { reason: string; details?: string },
): Promise<{ ok: boolean; error?: string }> {
  const other = id.safeParse(otherId);
  const parsed = reportSchema.safeParse(input);
  if (!other.success || !parsed.success) return { ok: false, error: "Pick a reason." };
  const conv = conversationId ? id.safeParse(conversationId) : null;
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("report_user", {
    p_other: other.data,
    p_reason: parsed.data.reason,
    p_details: parsed.data.details || null,
    p_conversation: conv?.success ? conv.data : null,
  });
  if (error) return { ok: false, error: error.message === "rate_limited" ? "You've sent a lot of reports today." : "Couldn't send the report." };
  return { ok: true };
}
