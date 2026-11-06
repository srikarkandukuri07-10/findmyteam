"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo } from "react";
import { StudentAvatar } from "@/components/student-avatar";
import type { ConversationSummary } from "@/lib/messages/data";
import { inboxTime } from "@/lib/messages/format";
import { createClient } from "@/lib/supabase/client";

/** The list of conversations. A new message anywhere moves its conversation to the top, live. */
export function InboxList({ conversations, activeId }: { conversations: ConversationSummary[]; activeId?: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    // RLS only delivers messages from my own conversations.
    let t: number | undefined;
    const channel = supabase
      .channel("inbox")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        window.clearTimeout(t);
        t = window.setTimeout(() => router.refresh(), 250);
      })
      .subscribe();
    return () => {
      window.clearTimeout(t);
      void supabase.removeChannel(channel);
    };
  }, [supabase, router]);

  if (conversations.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <span className="float grid size-16 place-items-center rounded-3xl bg-accent-soft text-3xl">💬</span>
        <p className="font-semibold">No conversations yet</p>
        <p className="max-w-56 text-sm text-muted">
          When someone accepts your request (or you accept theirs), you can chat here.
        </p>
        <Link
          href="/discover?go=1"
          className="mt-1 rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-accent-foreground"
        >
          Start scouting
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-1 p-2">
      <AnimatePresence initial={false}>
        {conversations.map((c, i) => {
          const active = c.id === activeId;
          return (
            <motion.li
              key={c.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0, transition: { delay: Math.min(i, 8) * 0.03 } }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
            >
              <Link
                href={`/messages/${c.id}`}
                aria-current={active ? "page" : undefined}
                className={`relative flex items-center gap-3 rounded-2xl px-3 py-3 transition-colors ${
                  active ? "bg-accent-soft" : "hover:bg-surface-muted/70"
                }`}
              >
                <span className="relative">
                  <StudentAvatar id={c.otherId} name={c.otherName} avatarPath={c.otherAvatarPath} size="md" />
                  {c.unread > 0 && !c.muted && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -right-0.5 -top-0.5 size-3.5 rounded-full border-2 border-surface bg-accent-ink"
                    />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className={`truncate ${c.unread > 0 ? "font-bold" : "font-semibold"}`}>{c.otherName}</span>
                    <span className="shrink-0 text-[11px] text-muted">{inboxTime(c.lastAt)}</span>
                  </span>
                  <span className="flex items-center justify-between gap-2">
                    <span className={`truncate text-sm ${c.unread > 0 ? "font-medium text-foreground" : "text-muted"}`}>
                      {c.blocked
                        ? "Conversation closed"
                        : c.lastBody
                          ? `${c.lastFromMe ? "You: " : ""}${c.lastBody}`
                          : "Say hi 👋"}
                    </span>
                    {c.muted ? (
                      <span className="shrink-0 text-[11px] text-muted" title="Muted">
                        🔕
                      </span>
                    ) : (
                      c.unread > 0 && (
                        <span className="grid min-w-5 shrink-0 place-items-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-accent-foreground">
                          {c.unread > 99 ? "99+" : c.unread}
                        </span>
                      )
                    )}
                  </span>
                </span>
              </Link>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ul>
  );
}
