"use client";

import Link from "next/link";
import { AnimatePresence, animate, motion, useReducedMotion } from "motion/react";
import {
  Fragment,
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { getStanding, joinWaitlist, type JoinState } from "@/app/waitlist-actions";
import type { WaitlistOptions, WaitlistStats } from "@/lib/waitlist/data";
import { inviteMessage, ordinal, type Standing } from "@/lib/validation/waitlist";

const STORAGE_KEY = "fmt-waitlist-code";
const YEARS = [1, 2, 3, 4, 5];

function readStoredCode() {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
function storeCode(code: string | null) {
  try {
    if (code) window.localStorage.setItem(STORAGE_KEY, code);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Private mode: the success screen just won't come back on the next visit.
  }
}

const field =
  "w-full rounded-2xl border border-border bg-background/40 px-4 py-3 text-[15px] transition focus:border-accent focus:bg-surface focus:outline-none focus:ring-4 focus:ring-accent/20";

const noSubscribe = () => () => {};

/** Invite code (?ref=) and campaign source (?src= / utm_source, or Instagram as the referrer) from the link. */
function useLinkParams() {
  const search = useSyncExternalStore(
    noSubscribe,
    () => window.location.search,
    () => "",
  );
  const referrer = useSyncExternalStore(
    noSubscribe,
    () => document.referrer,
    () => "",
  );
  return useMemo(() => {
    const params = new URLSearchParams(search);
    const r = params.get("ref")?.toLowerCase() ?? "";
    const s = (params.get("src") ?? params.get("utm_source") ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "")
      .slice(0, 40);
    return {
      ref: /^[a-z0-9]{8}$/.test(r) ? r : "",
      source: s || (referrer.includes("instagram") ? "instagram" : ""),
    };
  }, [search, referrer]);
}

function FieldError({ text }: { text?: string }) {
  return (
    <AnimatePresence>
      {text && (
        <motion.p
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0 }}
          className="mt-1.5 text-sm font-medium text-danger"
        >
          {text}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

/** WAIT-1: the waitlist form, then the "you're in" screen with an invite link. */
export function WaitlistForm({ options, stats }: { options: WaitlistOptions; stats: WaitlistStats }) {
  const [state, formAction, pending] = useActionState<JoinState, FormData>(joinWaitlist, { kind: "idle" });
  const [restored, setRestored] = useState<{
    standing: Standing;
    stats: WaitlistStats;
  } | null>(null);
  const [college, setCollege] = useState("");
  const [, startRestore] = useTransition();
  const { ref, source } = useLinkParams();

  // The visitor's own code, if they joined before on this browser.
  useEffect(() => {
    const mine = readStoredCode();
    if (mine) {
      startRestore(async () => {
        const found = await getStanding(mine);
        if (found) setRestored(found);
        else storeCode(null);
      });
    }
  }, []);

  useEffect(() => {
    if (state.kind === "joined") storeCode(state.standing.code);
  }, [state]);

  const success = state.kind === "joined" ? state : restored ? { kind: "joined" as const, ...restored } : null;
  const errors = state.kind === "error" ? (state.errors ?? {}) : {};
  const values = state.kind === "error" ? state.values : undefined;
  const message = state.kind === "error" ? state.message : undefined;

  return (
    <AnimatePresence mode="wait" initial={false}>
      {success ? (
        <Success
          key="success"
          standing={success.standing}
          stats={success.stats}
          onReset={() => {
            // A fresh page is the simplest way to clear the form's saved result.
            storeCode(null);
            window.location.hash = "join";
            window.location.reload();
          }}
        />
      ) : (
        <motion.form
          key="form"
          action={formAction}
          noValidate
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, x: -60, transition: { duration: 0.3 } }}
          className="space-y-5"
        >
          {/* React clears a form after each submit; remounting the fields with the echoed values keeps what was typed. */}
          <Fragment key={state.kind === "error" ? state.attempt : 0}>
            {ref && (
              <motion.p
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-2xl bg-accent-soft px-4 py-2.5 text-sm font-semibold text-accent-ink"
              >
                🎉 A friend invited you. Joining with their link moves you both up.
              </motion.p>
            )}

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="wl-name" className="mb-1.5 block text-sm font-semibold">
                  Your name
                </label>
                <input
                  id="wl-name"
                  name="name"
                  autoComplete="name"
                  maxLength={80}
                  required
                  defaultValue={values?.name}
                  className={field}
                  placeholder="Ananya Rao"
                />
                <FieldError text={errors.name} />
              </div>
              <div>
                <label htmlFor="wl-email" className="mb-1.5 block text-sm font-semibold">
                  Email
                </label>
                <input
                  id="wl-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  maxLength={254}
                  defaultValue={values?.email}
                  required
                  className={field}
                  placeholder="you@example.com"
                />
                <FieldError text={errors.email} />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="wl-college" className="mb-1.5 block text-sm font-semibold">
                  College
                </label>
                <select
                  id="wl-college"
                  name="college"
                  required
                  defaultValue={values?.college ?? ""}
                  onChange={(e) => setCollege(e.target.value)}
                  className={field}
                >
                  <option value="" disabled>
                    Pick your college
                  </option>
                  {options.colleges.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                  <option value="other">My college isn&apos;t listed</option>
                </select>
                <FieldError text={errors.college} />
              </div>
              <div>
                <label htmlFor="wl-branch" className="mb-1.5 block text-sm font-semibold">
                  Branch <span className="font-normal text-muted">(optional)</span>
                </label>
                <select id="wl-branch" name="branch" defaultValue={values?.branch ?? ""} className={field}>
                  <option value="">Pick your branch</option>
                  {options.branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <AnimatePresence initial={false}>
              {college === "other" && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <label htmlFor="wl-college-other" className="mb-1.5 block text-sm font-semibold">
                    Your college&apos;s name
                  </label>
                  <input
                    id="wl-college-other"
                    name="collegeOther"
                    maxLength={120}
                    defaultValue={values?.collegeOther}
                    className={field}
                    placeholder="Full name of your college"
                  />
                  <FieldError text={errors.collegeOther} />
                </motion.div>
              )}
            </AnimatePresence>

            <fieldset>
              <legend className="mb-2 text-sm font-semibold">Year of study</legend>
              <div className="flex flex-wrap gap-2">
                {YEARS.map((y) => (
                  <label key={y} className="cursor-pointer">
                    <input
                      type="radio"
                      name="year"
                      value={y}
                      required
                      defaultChecked={values?.year === String(y)}
                      className="peer sr-only"
                    />
                    <span className="grid h-11 min-w-14 place-items-center rounded-full border border-border bg-background/40 px-4 text-sm font-semibold transition peer-checked:border-accent peer-checked:bg-accent peer-checked:text-accent-foreground peer-focus-visible:ring-4 peer-focus-visible:ring-accent/30 hover:border-accent">
                      {ordinal(y)}
                    </span>
                  </label>
                ))}
              </div>
              <FieldError text={errors.year} />
            </fieldset>

            <fieldset>
              <legend className="mb-2 text-sm font-semibold">
                What do you bring to a team? <span className="font-normal text-muted">(pick any)</span>
              </legend>
              <div className="flex flex-wrap gap-2">
                {options.roles.map((r) => (
                  <label key={r.id} className="cursor-pointer">
                    <input
                      type="checkbox"
                      name="roles"
                      value={r.id}
                      defaultChecked={values?.roles.includes(String(r.id))}
                      className="peer sr-only"
                    />
                    <span className="inline-flex items-center rounded-full border border-border bg-background/40 px-3.5 py-2 text-sm font-medium transition peer-checked:border-accent-ink peer-checked:bg-accent-soft peer-checked:text-accent-ink peer-focus-visible:ring-4 peer-focus-visible:ring-accent/30 hover:border-accent">
                      {r.name}
                    </span>
                  </label>
                ))}
              </div>
              <FieldError text={errors.roles} />
            </fieldset>

            <div>
              <label htmlFor="wl-pain" className="mb-1.5 block text-sm font-semibold">
                What&apos;s the hardest part of finding a team?{" "}
                <span className="font-normal text-muted">(optional)</span>
              </label>
              <textarea
                id="wl-pain"
                name="painPoint"
                rows={2}
                maxLength={300}
                defaultValue={values?.painPoint}
                className={`${field} resize-none`}
                placeholder="Everyone I know is a web developer…"
              />
              <FieldError text={errors.painPoint} />
            </div>

            <div className="space-y-3 rounded-2xl bg-background/30 p-4">
              <label className="flex cursor-pointer items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  name="btech"
                  required
                  defaultChecked={values?.btech}
                  className="mt-0.5 size-5 shrink-0 accent-accent-ink"
                />
                <span>I&apos;m currently pursuing a B.Tech or B.E. degree.</span>
              </label>
              <FieldError text={errors.btech} />
              <label className="flex cursor-pointer items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  name="consent"
                  required
                  defaultChecked={values?.consent}
                  className="mt-0.5 size-5 shrink-0 accent-accent-ink"
                />
                <span>
                  FindMyTeam can keep these details and email me when it launches. Read the{" "}
                  <Link href="/privacy" className="font-semibold text-accent-ink underline underline-offset-2">
                    privacy notice
                  </Link>
                  .
                </span>
              </label>
              <FieldError text={errors.consent} />
            </div>

            {/* Not for people: bots fill it in and are turned away. */}
            <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <label>
                Website
                <input name="website" tabIndex={-1} autoComplete="off" />
              </label>
            </div>
            <input type="hidden" name="ref" value={ref} />
            <input type="hidden" name="source" value={source} />
          </Fragment>

          <AnimatePresence>
            {message && (
              <motion.p
                role="alert"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-2xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger"
              >
                {message}
              </motion.p>
            )}
          </AnimatePresence>

          <motion.button
            type="submit"
            disabled={pending}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="relative w-full overflow-hidden rounded-full bg-accent px-6 py-4 text-base font-bold text-accent-foreground shadow-lift transition-colors hover:bg-accent-hover disabled:opacity-70"
          >
            <span className="relative z-10">{pending ? "Saving your spot…" : "Join the waitlist"}</span>
            <span aria-hidden className="button-shine absolute inset-0" />
          </motion.button>
          <p className="text-center text-xs text-muted">
            Free. No spam.{" "}
            {stats.total >= 50
              ? `${stats.total.toLocaleString("en-IN")} students are already waiting.`
              : "Be one of the first."}
          </p>
        </motion.form>
      )}
    </AnimatePresence>
  );
}

function CountUp({ to }: { to: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduce) {
      el.textContent = ordinal(to);
      return;
    }
    const controls = animate(Math.max(1, to * 3 + 20), to, {
      duration: 1.2,
      ease: [0.2, 0.7, 0.2, 1],
      onUpdate: (v) => {
        el.textContent = ordinal(Math.round(v));
      },
    });
    return () => controls.stop();
  }, [to, reduce]);
  return <span ref={ref}>{ordinal(to)}</span>;
}

const BURST = Array.from({ length: 16 }, (_, i) => {
  const angle = (i / 16) * Math.PI * 2;
  return {
    x: Math.cos(angle) * (90 + (i % 3) * 30),
    y: Math.sin(angle) * (70 + (i % 4) * 22),
    size: 8 + (i % 3) * 4,
  };
});

function Success({ standing, stats, onReset }: { standing: Standing; stats: WaitlistStats; onReset: () => void }) {
  const reduce = useReducedMotion();
  const [copied, setCopied] = useState(false);
  const origin = useSyncExternalStore(
    noSubscribe,
    () => window.location.origin,
    () => "",
  );
  const link = `${origin}/?ref=${standing.code}`;
  const text = inviteMessage(link);
  const top = stats.colleges[0]?.count ?? 1;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };
  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "FindMyTeam", text, url: link });
      } catch {
        // Closed the share sheet.
      }
    } else {
      void copy();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className="relative space-y-6 text-center"
      aria-live="polite"
    >
      {!reduce && (
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-10">
          {BURST.map((p, i) => (
            <motion.span
              key={i}
              className="absolute rounded-full"
              style={{
                width: p.size,
                height: p.size,
                background: i % 2 ? "var(--accent)" : "var(--accent-ink)",
              }}
              initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
              animate={{ x: p.x, y: p.y, opacity: 0, scale: 1 }}
              transition={{ duration: 1.1, ease: "easeOut", delay: 0.1 }}
            />
          ))}
        </div>
      )}

      <div className="space-y-2">
        <motion.span
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 14,
            delay: 0.1,
          }}
          className="mx-auto grid size-16 place-items-center rounded-full bg-accent text-3xl text-accent-foreground shadow-lift"
        >
          ✓
        </motion.span>
        <h3 className="text-3xl font-bold tracking-tight">You&apos;re in!</h3>
        <p className="text-lg text-muted">
          You&apos;re{" "}
          <b className="text-accent-ink">
            <CountUp to={standing.position} />
          </b>{" "}
          on the waitlist.
        </p>
      </div>

      <div className="space-y-3 rounded-3xl bg-accent-soft p-5 text-left">
        <p className="font-semibold">Move up the list</p>
        <p className="text-sm text-muted">
          Every friend who joins with your link moves you up 10 places. Colleges with the most students waiting open
          first.
        </p>
        <div className="flex items-center gap-2 rounded-2xl bg-surface p-2 pl-4">
          <span className="min-w-0 flex-1 truncate font-mono text-sm">{link || `…/?ref=${standing.code}`}</span>
          <motion.button
            type="button"
            onClick={copy}
            whileTap={{ scale: 0.94 }}
            className="shrink-0 rounded-xl bg-accent px-4 py-2 text-sm font-bold text-accent-foreground"
          >
            {copied ? "Copied!" : "Copy"}
          </motion.button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(text)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-2xl bg-surface px-4 py-3 text-center text-sm font-semibold transition hover:-translate-y-0.5 hover:shadow-card"
          >
            Share on WhatsApp
          </a>
          <button
            type="button"
            onClick={share}
            className="rounded-2xl bg-surface px-4 py-3 text-sm font-semibold transition hover:-translate-y-0.5 hover:shadow-card"
          >
            More ways to share
          </button>
        </div>
        <p className="text-sm text-muted">
          Friends joined with your link: <b className="text-foreground">{standing.referrals}</b>
        </p>
      </div>

      {stats.colleges.length > 0 && (
        <div className="space-y-3 text-left">
          <p className="font-semibold">Colleges with the most students waiting</p>
          <ol className="space-y-2">
            {stats.colleges.map((c, i) => (
              <li key={c.name} className="space-y-1">
                <div className="flex justify-between gap-3 text-sm">
                  <span className="truncate">
                    {i + 1}. {c.name}
                  </span>
                  <span className="font-semibold">{c.count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-chip">
                  <motion.div
                    className="h-full rounded-full bg-accent"
                    initial={{ width: 0 }}
                    animate={{
                      width: `${Math.max(6, (c.count / top) * 100)}%`,
                    }}
                    transition={{
                      duration: 0.9,
                      delay: 0.3 + i * 0.08,
                      ease: [0.2, 0.7, 0.2, 1],
                    }}
                  />
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      <button
        type="button"
        onClick={onReset}
        className="text-sm font-medium text-muted underline underline-offset-2 hover:text-foreground"
      >
        Not you? Join with another email
      </button>
    </motion.div>
  );
}
