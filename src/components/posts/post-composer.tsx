"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { createPost, previewLink } from "@/app/(app)/(shell)/posts/actions";
import { CloseIcon } from "@/components/icons";
import { HackathonSummary } from "@/components/posts/hackathon-summary";
import { StudentAvatar } from "@/components/student-avatar";
import type { HackathonPreview } from "@/lib/hackathon/extract";
import { normalizeLinkUrl } from "@/lib/hackathon/url";
import { resizePhoto } from "@/lib/posts/image";
import { createClient } from "@/lib/supabase/client";

type LinkState =
  | { kind: "idle" }
  | { kind: "invalid" }
  | { kind: "loading" }
  | { kind: "ready"; preview: HackathonPreview }
  | { kind: "unreadable" }
  | { kind: "error"; message: string };

const noSubscribe = () => () => {};

const icon = "size-5";
const LinkIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden className={icon} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
  </svg>
);
const PhotoIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden className={icon} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="16" rx="3" />
    <circle cx="9" cy="10" r="1.8" />
    <path d="m21 16-5-5-8 8" />
  </svg>
);
const TeamIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden className={icon} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 5.2a3.2 3.2 0 0 1 0 5.6M18 14.4c1.8.9 3 2.7 3 5.6" />
  </svg>
);

/**
 * The "What type of teammates are you looking for?" box. Tapping it opens the full post form: text (no length
 * limit), an optional hackathon link that is read into a summary, an optional photo, and an optional team.
 */
export function PostComposer({
  me,
  teams,
}: {
  me: { id: string; name: string; avatarPath: string | null };
  teams: { id: string; name: string }[];
}) {
  const router = useRouter();
  // The sheet is drawn into <body>: a parent's animation would otherwise shrink a fixed panel to its own size.
  const portalReady = useSyncExternalStore(noSubscribe, () => true, () => false);
  const supabase = useMemo(() => createClient(), []);
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [linkText, setLinkText] = useState("");
  const [read, setRead] = useState<{ url: string; state: Exclude<LinkState, { kind: "idle" | "invalid" | "loading" }> } | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [photo, setPhoto] = useState<{ blob: Blob; previewUrl: string } | null>(null);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [posted, setPosted] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const first = me.name.split(" ")[0] ?? me.name;

  // The sheet holds the screen: no scrolling behind it, and Esc closes it.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !posting && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, posting]);

  // Pasting a link reads the event page and shows its summary under the field. What is shown follows from the
  // pasted text and the last finished read, so an older answer for a replaced link can never appear.
  const linkUrl = useMemo(() => normalizeLinkUrl(linkText), [linkText]);
  const link: LinkState = !linkText.trim()
    ? { kind: "idle" }
    : !linkUrl
      ? { kind: "invalid" }
      : read?.url === linkUrl
        ? read.state
        : { kind: "loading" };

  const canPost = (body.trim() !== "" || linkText.trim() !== "" || photo !== null) && !posting && link.kind !== "loading";

  useEffect(() => {
    if (!linkUrl) return;
    const t = window.setTimeout(async () => {
      const res = await previewLink(linkUrl);
      if (!res.ok) setRead({ url: linkUrl, state: { kind: "error", message: res.error } });
      else setRead({ url: linkUrl, state: res.preview ? { kind: "ready", preview: res.preview } : { kind: "unreadable" } });
    }, 650);
    return () => window.clearTimeout(t);
  }, [linkUrl]);

  useEffect(() => () => void (photo && URL.revokeObjectURL(photo.previewUrl)), [photo]);

  const reset = () => {
    setBody("");
    setLinkText("");
    setTeamId(null);
    setPhoto(null);
    setError(null);
  };

  const pickPhoto = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    try {
      setPhoto(await resizePhoto(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't use that photo.");
    }
  };

  const submit = async () => {
    if (!canPost) return;
    setPosting(true);
    setError(null);
    let imagePath: string | undefined;
    if (photo) {
      imagePath = `${me.id}/${crypto.randomUUID()}.jpg`;
      const { error: upErr } = await supabase.storage.from("post-images").upload(imagePath, photo.blob, { contentType: "image/jpeg", cacheControl: "31536000", upsert: false });
      if (upErr) {
        setPosting(false);
        return setError("Couldn't upload the photo. Check your connection and try again.");
      }
    }
    const res = await createPost({ body, linkUrl: linkText.trim() || undefined, teamId: teamId ?? undefined, imagePath });
    if (!res.ok) {
      if (imagePath) void supabase.storage.from("post-images").remove([imagePath]);
      setPosting(false);
      return setError(res.error);
    }
    setPosting(false);
    reset();
    setOpen(false);
    setPosted(true);
    window.setTimeout(() => setPosted(false), 3500);
    router.refresh();
  };

  return (
    <>
      <section className="reveal rounded-[2rem] bg-surface p-4 shadow-card sm:p-5">
        <div className="flex items-center gap-3">
          <StudentAvatar id={me.id} name={me.name} avatarPath={me.avatarPath} size="md" />
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="min-w-0 flex-1 rounded-2xl border border-border bg-surface-muted px-4 py-2.5 text-left text-[15px] leading-snug text-muted transition-colors hover:border-accent hover:bg-surface"
          >
            What type of teammates are you looking for?
          </button>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            ["Link", <LinkIcon key="l" />],
            ["Photo", <PhotoIcon key="p" />],
            ["My team", <TeamIcon key="t" />],
          ].map(([label, ico]) => (
            <button
              key={label as string}
              type="button"
              onClick={() => setOpen(true)}
              className="flex items-center justify-center gap-2 rounded-2xl px-2 py-2.5 text-sm font-semibold text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
            >
              {ico}
              <span className="truncate">{label as string}</span>
            </button>
          ))}
        </div>
        <AnimatePresence>
          {posted && (
            <motion.p role="status" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-3 rounded-2xl bg-success-soft px-4 py-2.5 text-sm font-semibold text-success">
              Posted. People can see it now.
            </motion.p>
          )}
        </AnimatePresence>
      </section>

      {portalReady &&
        createPortal(
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[70] flex items-end bg-foreground/35 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !posting && setOpen(false)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Create a post"
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 34 }}
              onClick={(e) => e.stopPropagation()}
              className="flex h-full w-full flex-col bg-surface sm:h-auto sm:max-h-[92dvh] sm:max-w-xl sm:rounded-[2rem] sm:shadow-lift"
            >
              <header className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:pt-3">
                <button type="button" aria-label="Close" disabled={posting} onClick={() => setOpen(false)} className="grid size-10 place-items-center rounded-full hover:bg-surface-muted disabled:opacity-50">
                  <CloseIcon className="size-5" />
                </button>
                <h2 className="text-base font-bold">Create post</h2>
                <button
                  type="button"
                  onClick={submit}
                  disabled={!canPost}
                  className="min-w-20 rounded-full bg-accent px-5 py-2 text-sm font-bold text-accent-foreground transition active:scale-95 disabled:opacity-45"
                >
                  {posting ? "Posting…" : "Post"}
                </button>
              </header>

              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4 sm:px-6">
                <div className="flex items-center gap-3">
                  <StudentAvatar id={me.id} name={me.name} avatarPath={me.avatarPath} size="sm" />
                  <p className="font-semibold">{first}</p>
                </div>

                <textarea
                  autoFocus
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="What type of teammates are you looking for?"
                  aria-label="Your post"
                  className="block min-h-36 w-full resize-none bg-transparent text-lg leading-relaxed placeholder:text-muted/70 focus:outline-none [field-sizing:content]"
                />

                {/* Hackathon link */}
                <div className="space-y-2">
                  <label htmlFor="post-link" className="flex items-center gap-2 text-sm font-semibold">
                    <LinkIcon /> Hackathon link <span className="font-normal text-muted">(optional)</span>
                  </label>
                  <input
                    id="post-link"
                    type="url"
                    inputMode="url"
                    value={linkText}
                    onChange={(e) => setLinkText(e.target.value)}
                    placeholder="Paste the hackathon's official link"
                    autoComplete="off"
                    className="block w-full rounded-xl border border-border bg-surface-muted px-3.5 py-3 text-sm placeholder:text-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
                  />
                  {link.kind === "invalid" && <p className="text-xs text-muted">Paste the full link, like https://devfolio.co/…</p>}
                  {link.kind === "loading" && (
                    <div className="space-y-2 rounded-2xl border border-border p-3.5" aria-live="polite">
                      <p className="text-xs font-semibold text-accent-ink">Reading the event page…</p>
                      <span className="shimmer block h-4 w-2/3 rounded-full" />
                      <span className="shimmer block h-3 w-full rounded-full" />
                      <span className="shimmer block h-3 w-5/6 rounded-full" />
                    </div>
                  )}
                  {link.kind === "ready" && (
                    <div className="rounded-2xl border border-border p-3.5">
                      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-accent-ink">What readers will see under “What the hackathon is about”</p>
                      <HackathonSummary preview={link.preview} />
                    </div>
                  )}
                  {link.kind === "unreadable" && <p className="rounded-xl bg-surface-muted px-3.5 py-2.5 text-xs text-muted">We couldn&apos;t read details from that page. It will still show as a link.</p>}
                  {link.kind === "error" && <p className="text-xs font-medium text-danger">{link.message}</p>}
                </div>

                {/* Photo */}
                <div className="space-y-2">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <PhotoIcon /> Photo <span className="font-normal text-muted">(optional)</span>
                  </p>
                  <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={(e) => void pickPhoto(e.target.files?.[0]).then(() => (e.target.value = ""))} />
                  {photo ? (
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo.previewUrl} alt="Your photo" className="max-h-64 w-full rounded-2xl object-cover" />
                      <button type="button" aria-label="Remove the photo" onClick={() => setPhoto(null)} className="absolute right-2 top-2 grid size-9 place-items-center rounded-full bg-foreground/70 text-surface">
                        <CloseIcon className="size-4" />
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => fileRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-5 text-sm font-semibold text-muted transition-colors hover:border-accent hover:text-foreground">
                      <PhotoIcon /> Add a photo
                    </button>
                  )}
                </div>

                {/* Team */}
                <div className="space-y-2">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <TeamIcon /> Your team <span className="font-normal text-muted">(optional)</span>
                  </p>
                  {teams.length > 0 ? (
                    <>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" aria-pressed={teamId === null} onClick={() => setTeamId(null)} className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${teamId === null ? "bg-accent text-accent-foreground" : "bg-chip hover:bg-accent-soft"}`}>
                          No team, just me
                        </button>
                        {teams.map((t) => (
                          <button key={t.id} type="button" aria-pressed={teamId === t.id} onClick={() => setTeamId(t.id)} className={`max-w-full truncate rounded-full px-4 py-2 text-sm font-semibold transition-colors ${teamId === t.id ? "bg-accent text-accent-foreground" : "bg-chip hover:bg-accent-soft"}`}>
                            {t.name}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-muted">
                        {teamId ? "Readers can open your team from the post and ask to join." : "Without a team, people connect with you directly."}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-muted">
                      Recruiting for a team? <Link href="/teams/new" className="font-semibold text-accent-ink underline">Create one</Link> and you can attach it here so people can ask to join.
                    </p>
                  )}
                </div>

                {error && (
                  <p role="alert" className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm font-medium text-danger">
                    {error}
                  </p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
