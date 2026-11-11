"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { StudentAvatar } from "@/components/student-avatar";
import type { ConversationSummary } from "@/lib/messages/data";
import { inboxTime } from "@/lib/messages/format";
import { createClient } from "@/lib/supabase/client";
import { TeamBadge } from "./team-badge";

type Filter = "all" | "direct" | "teams";

function preview(c: ConversationSummary) {
  if (c.blocked) return "Conversation closed";
  if (!c.lastBody) return c.isTeam ? "Team chat created" : "Say hi 👋";
  if (c.lastKind === "system") return c.lastBody;
  if (c.lastFromMe) return `You: ${c.lastBody}`;
  if (c.isTeam && c.lastSenderName) return `${c.lastSenderName.split(" ")[0]}: ${c.lastBody}`;
  return c.lastBody;
}

/** The list of conversations. A new message anywhere moves its conversation to the top, live. */
export function InboxList({ conversations, activeId }: { conversations: ConversationSummary[]; activeId?: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [filter, setFilter] = useState<Filter>("all");
  const hasTeams = conversations.some((c) => c.isTeam);
  const shown = conversations.filter((c) => filter === "all" || (filter === "teams") === c.isTeam);

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
    <div>
      {hasTeams && (
        <div role="tablist" aria-label="Show" className="flex gap-1.5 px-4 pb-1 pt-1">
          {(
            [
              ["all", "All"],
              ["direct", "Direct"],
              ["teams", "Teams"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={filter === value}
              onClick={() => setFilter(value)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                filter === value ? "bg-accent text-accent-foreground" : "bg-surface-muted text-muted hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {shown.length === 0 && (
        <p className="p-6 text-center text-sm text-muted">
          {filter === "teams" ? "No team chats yet. Create or join a team to get one." : "No direct chats yet."}
        </p>
      )}
    <ul className="space-y-1 p-2">
      <AnimatePresence initial={false}>
        {shown.map((c, i) => {
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
                  {c.isTeam ? (
                    <TeamBadge id={c.otherId} name={c.otherName} className="size-12 text-sm" />
                  ) : (
                    <StudentAvatar id={c.otherId} name={c.otherName} avatarPath={c.otherAvatarPath} size="md" />
                  )}
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
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className={`truncate ${c.unread > 0 ? "font-bold" : "font-semibold"}`}>{c.otherName}</span>
                      {c.isTeam && (
                        <span className="shrink-0 rounded-full bg-accent-soft px-1.5 py-0.5 text-[10px] font-bold uppercase text-accent-ink">
                          Team
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-[11px] text-muted">{inboxTime(c.lastAt)}</span>
                  </span>
                  <span className="flex items-center justify-between gap-2">
                    <span className={`truncate text-sm ${c.unread > 0 ? "font-medium text-foreground" : "text-muted"}`}>
                      {preview(c)}
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
    </div>
  );
}
