"use client";

import { AnimatePresence, motion } from "motion/react";
import { useActionState, useState, useTransition } from "react";
import { VerifiedStudentBadge } from "@/components/verified-badge";
import { confirmCollegeCode, removeCollegeEmail, sendCollegeCode, type VerifyState } from "./actions";

const field =
  "w-full rounded-2xl border border-border bg-background/40 px-4 py-3 text-[15px] focus:border-accent focus:bg-surface focus:outline-none focus:ring-4 focus:ring-accent/20";
const primary =
  "h-[50px] rounded-full bg-accent px-6 font-bold text-accent-foreground transition hover:bg-accent-hover active:scale-95 disabled:opacity-60";

/**
 * D25: the optional Verified student badge. Step 1 emails a 6-digit code to a college address,
 * step 2 checks it. Unverified students keep every feature; only the badge is missing.
 */
export function VerifyPanel({
  confirmed,
  badge,
  waitingForDomain,
  pendingEmail,
  compact = false,
}: {
  confirmed: string | null;
  badge: boolean;
  waitingForDomain: boolean;
  pendingEmail: string | null;
  /** Lighter boxes, for use inside onboarding Card 1 (D26). */
  compact?: boolean;
}) {
  const box = compact ? "rounded-2xl bg-surface p-4 sm:p-5" : "reveal rounded-[2rem] bg-surface p-6 shadow-card sm:p-8";
  const [sendState, send, sending] = useActionState<VerifyState, FormData>(sendCollegeCode, { kind: "idle" });
  const [codeState, confirm, checking] = useActionState<VerifyState, FormData>(confirmCollegeCode, { kind: "idle" });
  const [changing, setChanging] = useState(false);
  const [removing, startRemove] = useTransition();

  const codeSent = (sendState.kind === "ok" && sendState.step === "code") || (pendingEmail !== null && sendState.kind !== "error");
  const done = codeState.kind === "ok" && codeState.step === "done";
  const showEmailForm = !done && (!confirmed || changing);

  return (
    <div className={compact ? "space-y-3" : "space-y-6"}>
      {confirmed && !changing && !done && (
        <section className={box}>
          <div className="flex flex-wrap items-center gap-3">
            {badge ? (
              <VerifiedStudentBadge />
            ) : (
              <span className="rounded-full bg-chip px-2.5 py-1 text-xs font-semibold text-muted">Waiting for review</span>
            )}
            <span className="font-semibold">{confirmed}</span>
          </div>
          <p className="mt-3 text-sm text-muted">
            {waitingForDomain
              ? "Your email is confirmed. Your college's email domain is new to us, so the badge appears once we've checked it belongs to your college."
              : "Other students see the badge, never this address."}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" onClick={() => setChanging(true)} className="rounded-full px-4 py-2 text-sm font-semibold text-accent-ink hover:bg-accent-soft">
              Use a different address
            </button>
            <button
              type="button"
              disabled={removing}
              onClick={() => startRemove(async () => void (await removeCollegeEmail()))}
              className="rounded-full px-4 py-2 text-sm font-semibold text-danger hover:bg-danger-soft disabled:opacity-60"
            >
              {removing ? "Removing…" : "Remove college email"}
            </button>
          </div>
        </section>
      )}

      {showEmailForm && (
        <section className={box}>
          <h2 className="text-lg font-semibold">1. Your college email</h2>
          <p className="mt-1 text-sm text-muted">
            The address your college gave you, like <b>name@yourcollege.ac.in</b>. It stays private: other students only
            see the badge.
          </p>
          <form action={send} className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
            <input name="email" type="email" required autoComplete="email" className={field} placeholder="you@yourcollege.ac.in" aria-label="College email" />
            <button type="submit" disabled={sending} className={primary}>
              {sending ? "Sending…" : codeSent ? "Send a new code" : "Send code"}
            </button>
          </form>
          <Message state={sendState} />
        </section>
      )}

      {codeSent && !done && (
        <section className={box}>
          <h2 className="text-lg font-semibold">2. Enter the code</h2>
          <p className="mt-1 text-sm text-muted">
            Check {pendingEmail && sendState.kind === "idle" ? <b>{pendingEmail}</b> : "your college inbox"} (and its spam
            folder) for an email from FindMyTeam.
          </p>
          <form action={confirm} className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
            <input
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              required
              className={`${field} text-center text-xl font-bold tracking-[0.5em]`}
              placeholder="••••••"
              aria-label="6-digit code"
            />
            <button type="submit" disabled={checking} className={primary}>
              {checking ? "Checking…" : "Verify"}
            </button>
          </form>
          <Message state={codeState} />
        </section>
      )}

      {done && (
        <section className="pop-in rounded-[2rem] bg-surface p-6 text-center shadow-card sm:p-8">
          {codeState.kind === "ok" && codeState.badge && (
            <div className="flex justify-center">
              <VerifiedStudentBadge />
            </div>
          )}
          <p className="mt-4 font-medium">{codeState.kind === "ok" && codeState.text}</p>
        </section>
      )}
    </div>
  );
}

function Message({ state }: { state: VerifyState }) {
  return (
    <AnimatePresence mode="wait">
      {state.kind !== "idle" && (
        <motion.p
          key={state.text}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0 }}
          role={state.kind === "error" ? "alert" : "status"}
          className={`mt-4 rounded-2xl px-4 py-3 text-sm font-medium ${
            state.kind === "ok" ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
          }`}
        >
          {state.text}
        </motion.p>
      )}
    </AnimatePresence>
  );
}
