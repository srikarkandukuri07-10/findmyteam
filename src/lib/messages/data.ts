import "server-only";
import { z } from "zod";
import { requireUser } from "@/lib/auth/dal";

export type ConversationSummary = {
  id: string;
  otherId: string;
  otherName: string;
  otherAvatarPath: string | null;
  otherIsDemo: boolean;
  lastBody: string | null;
  lastFromMe: boolean;
  lastAt: string;
  unread: number;
  muted: boolean;
  blocked: boolean;
};

export type ChatMessage = { id: number; senderId: string; body: string; createdAt: string };

/** MSG-1: my conversations, newest first. */
export async function listConversations(): Promise<ConversationSummary[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("list_conversations");
  if (error) throw error;
  return data.map((c) => ({
    id: c.id,
    otherId: c.other_id,
    otherName: c.other_name,
    otherAvatarPath: c.other_avatar_path,
    otherIsDemo: c.other_is_demo,
    lastBody: c.last_body,
    lastFromMe: Boolean(c.last_sender_is_me),
    lastAt: c.last_at,
    unread: c.unread,
    muted: c.muted,
    blocked: c.blocked,
  }));
}

const PAGE = 80;

/** One conversation: who it is with, the latest messages (oldest first) and how far the other person has read. */
export async function getThread(id: string) {
  if (!z.uuid().safeParse(id).success) return null;
  const { supabase, userId } = await requireUser();
  const [conversations, messages, members] = await Promise.all([
    listConversations(),
    supabase
      .from("messages")
      .select("id, sender_id, body, created_at")
      .eq("conversation_id", id)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(PAGE),
    supabase.from("conversation_members").select("user_id, last_read_at").eq("conversation_id", id),
  ]);
  const summary = conversations.find((c) => c.id === id);
  if (!summary) return null;
  if (messages.error) throw messages.error;

  const other = members.data?.find((m) => m.user_id !== userId);
  return {
    me: userId,
    summary,
    conversations,
    messages: (messages.data ?? [])
      .map((m) => ({ id: m.id, senderId: m.sender_id, body: m.body, createdAt: m.created_at }))
      .reverse() satisfies ChatMessage[],
    otherReadAt: other?.last_read_at ?? null,
  };
}

/** The sidebar badge: unread messages, muted and blocked conversations left out. */
export async function getUnreadTotal() {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("my_unread_total");
  return error ? 0 : data;
}
