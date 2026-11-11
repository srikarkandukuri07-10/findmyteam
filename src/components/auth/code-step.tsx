"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { CODE_LENGTH, CodeInput } from "./code-input";

export type VerifyState = { error?: string; tries?: number };
export type ResendResult = { ok: boolean; message?: string };

const RESEND_SECONDS = 60;
const empty = () => Array.from({ length: CODE_LENGTH }, () => "");

/**
 * D27: enter the 6-digit code from the email. Submits on the sixth digit. "Resend" unlocks after a
 * minute (Supabase allows one code a minute per email). With `autoSend`, the first code is sent when
 * the screen opens (used after Google, where no code has been sent yet).
 */
export function CodeStep({
  email,
  next,
  verify,
  resend,
  autoSend = false,
  changeEmailHref,
}: {
  email: string;
  next: string;
  verify: (prev: VerifyState, fd: FormData) => Promise<VerifyState>;
  resend: () => Promise<ResendResult>;
  autoSend?: boolean;
  /** Where "Use a different email" goes; hidden when the email can't change (after Google). */
  changeEmailHref?: string;
}) {
  const [state, action, checking] = useActionState<VerifyState, FormData>(verify, {});
  const [digits, setDigits] = useState<string[]>(empty);
  const [seconds, setSeconds] = useState(autoSend ? 0 : RESEND_SECONDS);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [sending, startSend] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const autoSent = useRef(false);

  // A wrong code clears the boxes so the next try starts clean (once per failed attempt).
  const [seenTry, setSeenTry] = useState(0);
  if (state.tries && state.tries !== seenTry) {
    setSeenTry(state.tries);
    setDigits(empty());
  }

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  function send() {
    startSend(async () => {
      const r = await resend();
      setNote(r.ok ? { ok: true, text: `Code sent to ${email}.` } : { ok: false, text: r.message ?? "Couldn't send the code. Try again." });
      // On success, or when a code went out a moment ago, wait before the next one.
      if (r.ok || r.message?.includes("moment ago")) setSeconds(RESEND_SECONDS);
    });
  }

  useEffect(() => {
    if (!autoSend || autoSent.current) return;
    autoSent.current = true;
    send();
    // send() only reads props that don't change while this screen is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSend]);

  const error = state.error;
  return (
    <div className="space-y-5">
      <p className="rounded-2xl bg-surface-muted px-4 py-3 text-sm">
        {autoSend && sending && !note ? "Sending a code to " : "We sent a 6-digit code to "}
        <b className="break-all">{email}</b>
        {changeEmailHref && (
          <>
            {" · "}
            <Link href={changeEmailHref} className="font-semibold text-accent-ink">
              Change
            </Link>
          </>
        )}
      </p>

      <form ref={formRef} action={action} className="space-y-4" noValidate>
        <input type="hidden" name="next" value={next} />
        <CodeInput
          name="code"
          digits={digits}
          onChange={setDigits}
          onComplete={() => requestAnimationFrame(() => formRef.current?.requestSubmit())}
          disabled={checking}
          invalid={Boolean(error)}
          resetKey={state.tries}
        />
        {error && (
          <p role="alert" className="text-sm font-medium text-danger">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={checking || digits.some((d) => d === "")}
          className="flex w-full items-center justify-center rounded-full bg-accent px-4 py-3.5 text-sm font-bold text-accent-foreground transition hover:bg-accent-hover active:scale-[0.98] disabled:opacity-50"
        >
          {checking ? "Checking…" : "Continue"}
        </button>
      </form>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted">Didn&apos;t get it? Check spam.</span>
        <button
          type="button"
          onClick={send}
          disabled={sending || seconds > 0}
          className="font-semibold text-accent-ink disabled:text-muted"
        >
          {sending ? "Sending…" : seconds > 0 ? `Resend in ${seconds}s` : "Resend code"}
        </button>
      </div>
      {note && (
        <p role="status" className={`text-sm ${note.ok ? "text-success" : "text-danger"}`}>
          {note.text}
        </p>
      )}
    </div>
  );
}
