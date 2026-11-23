"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { createPortal } from "react-dom";
import { deletePost, reportPost } from "@/app/(app)/(shell)/posts/actions";
import { QuickConnectButton } from "@/components/quick-connect-button";
import { StudentAvatar } from "@/components/student-avatar";
import { keyFacts, ExternalIcon, HackathonSummary } from "@/components/posts/hackathon-summary";
import { CloseIcon } from "@/components/icons";
import { hostOf } from "@/lib/hackathon/url";
import type { PostView } from "@/lib/posts/data";
import { timeAgo } from "@/lib/posts/format";

const SHOWN_CHARS = 600;
const noSubscribe = () => () => {};

const REASONS = [
  ["spam", "Spam or scam"],
  ["inappropriate", "Inappropriate photo or text"],
  ["harassment", "Harassment or bullying"],
  ["fake_profile", "Fake profile"],
  ["other", "Something else"],
] as const;

/** A long post folds up after a few lines, so one wall of text doesn't push the feed away. */
function PostText({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  if (!text.trim()) return null;
  const long = text.length > SHOWN_CHARS;
  const shown = long && !open ? text.slice(0, SHOWN_CHARS).replace(/\s+\S*$/, "") + "…" : text;
  return (
    <div>
      <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">{shown}</p>
      {long && (
        <button type="button" onClick={() => setOpen((o) => !o)} className="mt-1 text-sm font-semibold text-accent-ink hover:underline">
          {open ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}

function ReportDialog({ postId, onClose }: { postId: string; onClose: () => void }) {
  const [reason, setReason] = useState<(typeof REASONS)[number][0] | "">("");
  const [state, setState] = useState<"idle" | "busy" | "done" | string>("idle");
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-[80] grid place-items-end bg-foreground/30 p-0 backdrop-blur-sm sm:place-items-center sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Report this post"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-[2rem] bg-surface p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-lift sm:rounded-[2rem]"
      >
        {state === "done" ? (
          <div className="space-y-4 text-center">
            <h2 className="text-xl font-bold">Thanks for telling us</h2>
            <p className="text-sm text-muted">We&apos;ll look at it. They aren&apos;t told who reported.</p>
            <button type="button" onClick={onClose} className="rounded-full bg-chip px-6 py-2.5 text-sm font-semibold">
              Close
            </button>
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!reason) return setState("Pick a reason.");
              setState("busy");
              const r = await reportPost(postId, reason, "");
              setState(r.ok ? "done" : r.error);
            }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Report this post</h2>
              <button type="button" aria-label="Close" onClick={onClose} className="grid size-9 place-items-center rounded-full hover:bg-surface-muted">
                <CloseIcon className="size-4" />
              </button>
            </div>
            <fieldset className="space-y-2">
              {REASONS.map(([value, label]) => (
                <label key={value} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border px-4 py-3 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
                  <input type="radio" name="reason" value={value} checked={reason === value} onChange={() => setReason(value)} className="accent-accent-ink" />
                  {label}
                </label>
              ))}
            </fieldset>
            {state !== "idle" && state !== "busy" && <p className="text-sm font-medium text-danger">{state}</p>}
            <button type="submit" disabled={state === "busy"} className="w-full rounded-full bg-accent py-3 text-sm font-bold text-accent-foreground disabled:opacity-60">
              {state === "busy" ? "Sending…" : "Send report"}
            </button>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}

/** One post: who, what they wrote, a photo, the hackathon (with its summary), and the team to join if they have one. */
export function PostCard({ post }: { post: PostView }) {
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [deleting, startDelete] = useTransition();
  const portalReady = useSyncExternalStore(noSubscribe, () => true, () => false);
  const preview = post.preview;
  const facts = preview ? keyFacts(preview) : [];
  const first = post.authorName.split(" ")[0] ?? post.authorName;

  return (
    <article className="reveal space-y-4 rounded-[2rem] bg-surface p-4 shadow-card sm:p-6">
      <header className="flex items-start gap-3">
        <Link href={`/students/${post.authorId}`} className="shrink-0">
          <StudentAvatar id={post.authorId} name={post.authorName} avatarPath={post.authorAvatarPath} size="md" />
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={`/students/${post.authorId}`} className="block truncate font-semibold tracking-tight hover:underline">
            {post.authorName}
          </Link>
          <p className="truncate text-xs text-muted">{post.authorLine || "Student"}</p>
          <p className="text-xs text-muted">{timeAgo(post.createdAt)}</p>
        </div>
        <div className="relative">
          <button
            type="button"
            aria-label="Post options"
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
                className="absolute right-0 top-full z-20 mt-1 w-44 origin-top-right rounded-2xl bg-surface p-1.5 shadow-lift"
                onMouseLeave={() => setMenu(false)}
              >
                {post.isMine ? (
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => {
                      setMenu(false);
                      if (window.confirm("Delete this post?")) startDelete(async () => (await deletePost(post.id), router.refresh()));
                    }}
                    className="block w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-danger hover:bg-danger-soft disabled:opacity-60"
                  >
                    {deleting ? "Deleting…" : "Delete post"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setMenu(false);
                      setReporting(true);
                    }}
                    className="block w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium hover:bg-surface-muted"
                  >
                    Report post
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      <PostText text={post.body} />

      {post.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.imageUrl} alt={`Photo from ${first}'s post`} loading="lazy" decoding="async" className="max-h-[520px] w-full rounded-2xl bg-surface-muted object-cover" />
      )}

      {post.linkUrl && (
        <div className="overflow-hidden rounded-2xl border border-border">
          <div className="space-y-2.5 p-3.5">
            <a
              href={post.linkUrl}
              target="_blank"
              rel="noopener noreferrer nofollow ugc"
              className="group flex items-center justify-between gap-3"
            >
              <span className="min-w-0">
                <span className="block truncate font-semibold group-hover:underline">{preview?.name ?? hostOf(post.linkUrl)}</span>
                <span className="block truncate text-xs text-muted">Event page · {hostOf(post.linkUrl)}</span>
              </span>
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft text-accent-ink">
                <ExternalIcon className="size-4" />
              </span>
            </a>
            {facts.length > 0 && (
              <ul className="flex flex-wrap gap-1.5">
                {facts.slice(0, 3).map((f) => (
                  <li key={f.label} className="max-w-full truncate rounded-full bg-sand px-2.5 py-1 text-xs font-medium">
                    {f.value}
                  </li>
                ))}
              </ul>
            )}
          </div>
          {preview && (
            <>
              <button
                type="button"
                aria-expanded={aboutOpen}
                onClick={() => setAboutOpen((o) => !o)}
                className="flex w-full items-center justify-between gap-2 border-t border-border bg-accent-soft/50 px-3.5 py-3 text-sm font-bold text-accent-ink transition-colors hover:bg-accent-soft"
              >
                What the hackathon is about
                <svg viewBox="0 0 24 24" aria-hidden className={`size-4 transition-transform ${aboutOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              <AnimatePresence initial={false}>
                {aboutOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="border-t border-border p-3.5">
                      <HackathonSummary preview={preview} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      )}

      {post.team && (
        <div className="rounded-2xl bg-accent-soft/60 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-accent-ink">Team looking for teammates</p>
          <p className="mt-1 font-semibold leading-snug">{post.team.hackathonName}</p>
          <p className="text-xs text-muted">
            {post.team.memberCount} of {post.team.teamSize} members · {post.team.mode === "online" ? "Online" : "Offline"}
          </p>
          <p className="mt-2 line-clamp-2 text-sm">
            <span className="font-semibold">Looking for:</span> {post.team.lookingFor}
          </p>
          <div className="mt-3">
            {post.team.isMember ? (
              <Link href={`/teams/${post.team.id}`} className="inline-flex rounded-full bg-surface px-4 py-2 text-sm font-bold text-accent-ink shadow-card">
                Open your team
              </Link>
            ) : post.team.recruiting ? (
              <Link href={`/teams/${post.team.id}`} className="inline-flex rounded-full bg-accent px-4 py-2 text-sm font-bold text-accent-foreground shadow-card">
                View team &amp; ask to join →
              </Link>
            ) : (
              <span className="inline-flex rounded-full bg-chip px-4 py-2 text-sm font-medium text-muted">Not taking requests now</span>
            )}
          </div>
        </div>
      )}

      {post.connection !== "self" && (
        <footer className="flex items-center justify-between gap-3 border-t border-border/70 pt-3">
          <p className="min-w-0 truncate text-xs text-muted">{post.team ? `Or connect with ${first} directly` : `Connect with ${first} to team up`}</p>
          {post.connection === "none" && <QuickConnectButton id={post.authorId} name={post.authorName} />}
          {post.connection === "pending" && <span className="shrink-0 rounded-full bg-accent-soft px-3.5 py-1.5 text-xs font-bold text-accent-ink">Requested</span>}
          {post.connection === "connected" && <span className="shrink-0 rounded-full bg-success-soft px-3.5 py-1.5 text-xs font-bold text-success">Connected ✓</span>}
        </footer>
      )}

      {portalReady &&
        createPortal(
          <AnimatePresence>{reporting && <ReportDialog postId={post.id} onClose={() => setReporting(false)} />}</AnimatePresence>,
          document.body,
        )}
    </article>
  );
}
