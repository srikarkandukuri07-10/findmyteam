"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { blockPerson, markRead, reportPerson, sendMessage, setMuted } from "@/app/(app)/(shell)/messages/actions";
import { StudentAvatar } from "@/components/student-avatar";
import { CheckIcon, CloseIcon } from "@/components/icons";
import { BACK_TRANSITION } from "@/components/page-transition";
import type { ChatMessage } from "@/lib/messages/data";
import { clockTime, dayLabel, isNewDay, linkify } from "@/lib/messages/format";
import { createClient } from "@/lib/supabase/client";

type Bubble = ChatMessage & { state: "sent" | "pending" | "failed"; tempId?: string };

type Props = {
  conversationId: string;
  me: string;
  other: { id: string; name: string; avatarPath: string | null; isDemo: boolean };
  initialMessages: ChatMessage[];
  initialOtherReadAt: string | null;
  initialMuted: boolean;
  blocked: boolean;
};

const REASONS = [
  ["spam", "Spam or scam"],
  ["harassment", "Harassment or bullying"],
  ["fake_profile", "Fake profile"],
  ["inappropriate", "Inappropriate content"],
  ["other", "Something else"],
] as const;

/** A bubble shown before the server confirms it: a local id, a negative placeholder id and the time. */
let pendingCounter = 0;
function newPending() {
  pendingCounter += 1;
  return {
    tempId: `t-${Date.now()}-${pendingCounter}`,
    placeholderId: -Date.now() - pendingCounter,
    now: new Date().toISOString(),
  };
}

function Body({ text, mine }: { text: string; mine: boolean }) {
  return (
    <>
      {linkify(text).map((p, i) =>
        p.kind === "link" ? (
          <a
            key={i}
            href={p.href}
            target="_blank"
            rel="noopener noreferrer nofollow ugc"
            className={`break-all font-semibold underline underline-offset-2 ${mine ? "text-[#1f1b2e]" : "text-accent-ink"}`}
          >
            {p.text}
          </a>
        ) : (
          <Fragment key={i}>{p.text}</Fragment>
        ),
      )}
    </>
  );
}

function TypingDots() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.9 }}
      className="mt-2 inline-flex items-center gap-1 rounded-3xl rounded-bl-md bg-surface px-4 py-3 shadow-card"
      aria-label="Typing"
    >
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="size-2 rounded-full bg-accent-ink/70"
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
        />
      ))}
    </motion.div>
  );
}

/**
 * MSG-1, MSG-3, MSG-4, MSG-5, MSG-7: a 1:1 chat. New messages, the other person's read position and
 * their typing arrive live through Supabase Realtime (RLS decides who can listen).
 */
export function ChatThread({
  conversationId,
  me,
  other,
  initialMessages,
  initialOtherReadAt,
  initialMuted,
  blocked,
}: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [messages, setMessages] = useState<Bubble[]>(() => initialMessages.map((m) => ({ ...m, state: "sent" })));
  const [otherReadAt, setOtherReadAt] = useState(initialOtherReadAt);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [muted, setMutedState] = useState(initialMuted);
  const [menu, setMenu] = useState(false);
  const [dialog, setDialog] = useState<"report" | "block" | null>(null);
  const [, startTransition] = useTransition();
  const scroller = useRef<HTMLDivElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const typingChannel = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastTypingSent = useRef(0);
  const typingTimer = useRef<number | undefined>(undefined);

  const scrollToEnd = useCallback((smooth = true) => {
    requestAnimationFrame(() => {
      const el = scroller.current;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    });
  }, []);

  useEffect(() => scrollToEnd(false), [scrollToEnd]);

  // Read on open, and again whenever their message arrives while the chat is on screen.
  const readNow = useCallback(() => {
    if (document.visibilityState === "visible") void markRead(conversationId);
  }, [conversationId]);
  useEffect(() => {
    readNow();
    document.addEventListener("visibilitychange", readNow);
    return () => document.removeEventListener("visibilitychange", readNow);
  }, [readNow]);

  // Live: new messages and the other person's read position.
  useEffect(() => {
    if (blocked) return;
    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const m = payload.new as { id: number; sender_id: string; body: string; created_at: string };
          setMessages((cur) => {
            if (cur.some((x) => x.id === m.id)) return cur;
            // My own message coming back: replace the pending bubble instead of adding a second one.
            if (m.sender_id === me) {
              const i = cur.findIndex((x) => x.state === "pending" && x.body === m.body);
              if (i >= 0) {
                const next = cur.slice();
                next[i] = { id: m.id, senderId: m.sender_id, body: m.body, createdAt: m.created_at, state: "sent" };
                return next;
              }
            }
            return [...cur, { id: m.id, senderId: m.sender_id, body: m.body, createdAt: m.created_at, state: "sent" }];
          });
          if (m.sender_id !== me) {
            setTyping(false);
            readNow();
          }
          scrollToEnd();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "conversation_members",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const row = payload.new as { user_id: string; last_read_at: string };
          if (row.user_id !== me) setOtherReadAt(row.last_read_at);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, conversationId, me, blocked, readNow, scrollToEnd]);

  // Typing, on a private channel only the two members may join.
  useEffect(() => {
    if (blocked) return;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;
    void (async () => {
      await supabase.realtime.setAuth();
      if (cancelled) return;
      channel = supabase
        .channel(`typing:${conversationId}`, { config: { private: true, broadcast: { self: false } } })
        .on("broadcast", { event: "typing" }, (msg) => {
          if ((msg.payload as { from?: string })?.from === me) return;
          setTyping(true);
          window.clearTimeout(typingTimer.current);
          typingTimer.current = window.setTimeout(() => setTyping(false), 3500);
          scrollToEnd();
        })
        .subscribe();
      typingChannel.current = channel;
    })();
    return () => {
      cancelled = true;
      window.clearTimeout(typingTimer.current);
      typingChannel.current = null;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [supabase, conversationId, me, blocked, scrollToEnd]);

  const announceTyping = () => {
    const now = Date.now();
    if (now - lastTypingSent.current < 2000) return;
    lastTypingSent.current = now;
    void typingChannel.current?.send({ type: "broadcast", event: "typing", payload: { from: me } });
  };

  const send = (text: string, retryTempId?: string) => {
    const body = text.trim();
    if (!body) return;
    const { tempId: freshId, placeholderId, now } = newPending();
    const tempId = retryTempId ?? freshId;
    const optimistic: Bubble = {
      id: placeholderId,
      senderId: me,
      body,
      createdAt: now,
      state: "pending",
      tempId,
    };
    setMessages((cur) =>
      retryTempId ? cur.map((m) => (m.tempId === retryTempId ? optimistic : m)) : [...cur, optimistic],
    );
    setNotice(null);
    if (!retryTempId) setDraft("");
    scrollToEnd();
    startTransition(async () => {
      const res = await sendMessage(conversationId, body);
      setMessages((cur) => {
        if (!res.ok) return cur.map((m) => (m.tempId === tempId ? { ...m, state: "failed" } : m));
        // The live event may already have added it.
        if (cur.some((m) => m.id === res.id)) return cur.filter((m) => m.tempId !== tempId);
        return cur.map((m) =>
          m.tempId === tempId ? { ...m, id: res.id, createdAt: res.createdAt, state: "sent" } : m,
        );
      });
      if (!res.ok) setNotice(res.error);
    });
  };

  const lastMineSeen = useMemo(() => {
    if (!otherReadAt) return null;
    const read = Date.parse(otherReadAt);
    const mine = messages.filter((m) => m.senderId === me && m.state === "sent" && Date.parse(m.createdAt) <= read);
    return mine.at(-1)?.id ?? null;
  }, [messages, otherReadAt, me]);

  const first = other.name.split(" ")[0] ?? other.name;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[2rem] bg-surface/70 shadow-card">
      {/* Header */}
      <header className="relative z-20 flex items-center gap-3 border-b border-border/70 bg-surface px-4 py-3 sm:px-5">
        <Link
          href="/messages"
          transitionTypes={BACK_TRANSITION}
          aria-label="Back to messages"
          className="grid size-9 place-items-center rounded-full text-lg hover:bg-surface-muted lg:hidden"
        >
          ←
        </Link>
        <Link href={`/students/${other.id}`} className="flex min-w-0 flex-1 items-center gap-3">
          <StudentAvatar id={other.id} name={other.name} avatarPath={other.avatarPath} size="sm" />
          <span className="min-w-0">
            <span className="flex items-center gap-2">
              <span className="truncate font-semibold">{other.name}</span>
              {other.isDemo && (
                <span className="rounded-full bg-chip px-2 py-0.5 text-[10px] font-semibold uppercase">Sample</span>
              )}
            </span>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={typing ? "typing" : "profile"}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className={`block text-xs ${typing ? "font-semibold text-accent-ink" : "text-muted"}`}
              >
                {typing ? "typing…" : muted ? "Muted · view profile" : "View profile"}
              </motion.span>
            </AnimatePresence>
          </span>
        </Link>
        <div className="relative">
          <button
            type="button"
            aria-label="Conversation options"
            aria-expanded={menu}
            onClick={() => setMenu((m) => !m)}
            className="grid size-10 place-items-center rounded-full text-xl font-bold text-muted hover:bg-surface-muted"
          >
            ⋯
          </button>
          <AnimatePresence>
            {menu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -6 }}
                className="absolute right-0 top-full z-30 mt-2 w-52 origin-top-right rounded-2xl bg-surface p-1.5 shadow-lift"
                onMouseLeave={() => setMenu(false)}
              >
                {!blocked && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenu(false);
                      const next = !muted;
                      setMutedState(next);
                      startTransition(async () => {
                        const r = await setMuted(conversationId, next);
                        if (!r.ok) setMutedState(!next);
                        router.refresh();
                      });
                    }}
                    className="block w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium hover:bg-surface-muted"
                  >
                    {muted ? "Unmute" : "Mute"} conversation
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setMenu(false);
                    setDialog("report");
                  }}
                  className="block w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium hover:bg-surface-muted"
                >
                  Report {first}
                </button>
                {!blocked && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenu(false);
                      setDialog("block");
                    }}
                    className="block w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-danger hover:bg-danger-soft"
                  >
                    Block {first}
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Messages */}
      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6">
        {messages.length === 0 && !blocked && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mx-auto mt-10 max-w-xs text-center"
          >
            <StudentAvatar
              id={other.id}
              name={other.name}
              avatarPath={other.avatarPath}
              size="lg"
              className="mx-auto"
            />
            <p className="mt-3 font-semibold">You and {first} are connected</p>
            <p className="mt-1 text-sm text-muted">Say hi and share what you want to build.</p>
          </motion.div>
        )}
        {blocked && (
          <p className="mx-auto mt-10 max-w-xs rounded-2xl bg-surface p-5 text-center text-sm text-muted">
            This conversation is closed. Neither of you can send or read messages here.
          </p>
        )}

        <ul className="space-y-1">
          {messages.map((m, i) => {
            const mine = m.senderId === me;
            const prev = messages[i - 1];
            const next = messages[i + 1];
            const newDay = isNewDay(prev?.createdAt, m.createdAt);
            const groupedWithPrev = !newDay && prev?.senderId === m.senderId;
            const lastInGroup = next?.senderId !== m.senderId || isNewDay(m.createdAt, next.createdAt);
            return (
              <Fragment key={m.tempId ?? m.id}>
                {newDay && (
                  <li className="sticky top-0 z-10 flex justify-center py-3">
                    <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-muted shadow-card">
                      {dayLabel(m.createdAt)}
                    </span>
                  </li>
                )}
                <motion.li
                  layout="position"
                  initial={{ opacity: 0, y: 14, scale: 0.94, x: mine ? 18 : -18 }}
                  animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
                  transition={{ type: "spring", stiffness: 420, damping: 30 }}
                  className={`flex ${mine ? "justify-end" : "justify-start"} ${groupedWithPrev ? "" : "pt-2"}`}
                >
                  <div className={`flex max-w-[82%] flex-col ${mine ? "items-end" : "items-start"}`}>
                    <div
                      className={`whitespace-pre-wrap break-words px-4 py-2.5 text-[15px] leading-relaxed shadow-card ${
                        mine
                          ? `bg-accent text-accent-foreground ${lastInGroup ? "rounded-3xl rounded-br-md" : "rounded-3xl"}`
                          : `bg-surface ${lastInGroup ? "rounded-3xl rounded-bl-md" : "rounded-3xl"}`
                      } ${m.state === "pending" ? "opacity-70" : ""} ${m.state === "failed" ? "ring-2 ring-danger" : ""}`}
                    >
                      <Body text={m.body} mine={mine} />
                    </div>
                    {lastInGroup && (
                      <span className="mt-1 flex items-center gap-1 px-1 text-[11px] text-muted">
                        {m.state === "failed" ? (
                          <button
                            type="button"
                            onClick={() => send(m.body, m.tempId)}
                            className="font-semibold text-danger underline"
                          >
                            Not sent · Retry
                          </button>
                        ) : (
                          <>
                            {clockTime(m.createdAt)}
                            {mine &&
                              (m.state === "pending" ? (
                                <span aria-label="Sending">· sending</span>
                              ) : m.id === lastMineSeen ? (
                                <motion.span
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="font-semibold text-accent-ink"
                                >
                                  · Seen
                                </motion.span>
                              ) : (
                                <CheckIcon className="size-3.5" aria-label="Sent" />
                              ))}
                          </>
                        )}
                      </span>
                    )}
                  </div>
                </motion.li>
              </Fragment>
            );
          })}
        </ul>
        <AnimatePresence>{typing && <TypingDots key="typing" />}</AnimatePresence>
      </div>

      {/* Composer */}
      {blocked ? null : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(draft);
            textarea.current?.focus();
          }}
          className="border-t border-border/70 bg-surface p-3 sm:p-4"
        >
          <AnimatePresence>
            {(notice || other.isDemo) && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className={`mb-2 px-2 text-xs font-medium ${notice ? "text-danger" : "text-muted"}`}
                role={notice ? "alert" : undefined}
              >
                {notice ?? `${first} is a sample student, so they won't reply.`}
              </motion.p>
            )}
          </AnimatePresence>
          <div className="flex items-end gap-2">
            <textarea
              ref={textarea}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                if (e.target.value) announceTyping();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  send(draft);
                }
              }}
              rows={1}
              maxLength={2000}
              placeholder={`Message ${first}…`}
              aria-label={`Message ${first}`}
              className="max-h-36 min-h-12 flex-1 resize-none rounded-3xl border border-border bg-background/30 px-4 py-3 text-[15px] [field-sizing:content] focus:border-accent focus:bg-surface focus:outline-none focus:ring-4 focus:ring-accent/20"
            />
            <motion.button
              type="submit"
              aria-label="Send"
              disabled={!draft.trim()}
              whileTap={{ scale: 0.88 }}
              animate={{ scale: draft.trim() ? 1 : 0.92, opacity: draft.trim() ? 1 : 0.5 }}
              className="grid size-12 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground shadow-lift"
            >
              <svg viewBox="0 0 24 24" aria-hidden className="size-5 translate-x-px" fill="currentColor">
                <path d="M3.4 20.4 21 12 3.4 3.6 3.4 10l12.6 2-12.6 2z" />
              </svg>
            </motion.button>
          </div>
          {draft.length > 1800 && <p className="mt-1 px-2 text-right text-xs text-muted">{2000 - draft.length} left</p>}
        </form>
      )}

      {/* Report / block dialogs */}
      <AnimatePresence>
        {dialog && (
          <motion.div
            className="fixed inset-0 z-[80] grid place-items-center bg-foreground/30 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDialog(null)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-[2rem] bg-surface p-6 shadow-lift"
            >
              {dialog === "block" ? (
                <BlockDialog
                  name={first}
                  onCancel={() => setDialog(null)}
                  onConfirm={async () => {
                    const r = await blockPerson(other.id);
                    if (r.ok) {
                      setDialog(null);
                      router.refresh();
                    }
                    return r.ok;
                  }}
                />
              ) : (
                <ReportDialog
                  name={first}
                  onCancel={() => setDialog(null)}
                  onSubmit={(reason, details) => reportPerson(other.id, conversationId, { reason, details })}
                />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BlockDialog({
  name,
  onCancel,
  onConfirm,
}: {
  name: string;
  onCancel: () => void;
  onConfirm: () => Promise<boolean>;
}) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Block {name}?</h2>
      <p className="text-sm text-muted">
        You won&apos;t see each other in Scout or search, your connection ends, and neither of you can send or read
        messages here. {name} isn&apos;t told.
      </p>
      {failed && <p className="text-sm font-medium text-danger">Couldn&apos;t block. Try again.</p>}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full px-5 py-2.5 text-sm font-semibold hover:bg-surface-muted"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const ok = await onConfirm();
            setBusy(false);
            setFailed(!ok);
          }}
          className="rounded-full bg-danger px-5 py-2.5 text-sm font-bold text-surface disabled:opacity-60"
        >
          {busy ? "Blocking…" : "Block"}
        </button>
      </div>
    </div>
  );
}

function ReportDialog({
  name,
  onCancel,
  onSubmit,
}: {
  name: string;
  onCancel: () => void;
  onSubmit: (reason: string, details: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [reason, setReason] = useState<string>("");
  const [details, setDetails] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | string>("idle");

  if (state === "done") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="space-y-4 text-center"
      >
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-success-soft text-success">
          <CheckIcon className="size-7" />
        </span>
        <h2 className="text-xl font-bold">Thanks for telling us</h2>
        <p className="text-sm text-muted">We&apos;ll look into it. {name} isn&apos;t told who reported them.</p>
        <button type="button" onClick={onCancel} className="rounded-full bg-chip px-6 py-2.5 text-sm font-semibold">
          Close
        </button>
      </motion.div>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!reason) return setState("Pick a reason.");
        setState("busy");
        const r = await onSubmit(reason, details);
        setState(r.ok ? "done" : (r.error ?? "Couldn't send the report."));
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-xl font-bold">Report {name}</h2>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close"
          className="grid size-8 place-items-center rounded-full hover:bg-surface-muted"
        >
          <CloseIcon className="size-4" />
        </button>
      </div>
      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-semibold">What&apos;s wrong?</legend>
        {REASONS.map(([value, label]) => (
          <label
            key={value}
            className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border px-4 py-3 text-sm transition has-[:checked]:border-accent has-[:checked]:bg-accent-soft"
          >
            <input
              type="radio"
              name="reason"
              value={value}
              checked={reason === value}
              onChange={() => setReason(value)}
              className="accent-accent-ink"
            />
            {label}
          </label>
        ))}
      </fieldset>
      <textarea
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        maxLength={1000}
        rows={3}
        placeholder="Anything else we should know? (optional)"
        className="w-full resize-none rounded-2xl border border-border bg-background/30 px-4 py-3 text-sm focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/20"
      />
      {state !== "idle" && state !== "busy" && <p className="text-sm font-medium text-danger">{state}</p>}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full px-5 py-2.5 text-sm font-semibold hover:bg-surface-muted"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={state === "busy"}
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-accent-foreground disabled:opacity-60"
        >
          {state === "busy" ? "Sending…" : "Send report"}
        </button>
      </div>
    </form>
  );
}
