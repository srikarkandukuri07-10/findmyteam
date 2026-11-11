"use client";

import { useActionState, useState } from "react";
import { FormMessage } from "@/components/form";
import type { CodeState } from "@/app/(auth)/actions";

const control =
  "block w-full rounded-xl border border-border bg-surface-muted px-3.5 py-3 text-sm placeholder:text-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25";
const primary =
  "flex w-full items-center justify-center rounded-full bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground transition hover:bg-accent-hover active:scale-[0.98] disabled:opacity-60";

/**
 * D27: email in, 6-digit code out, no password. Used on /login (any email) and /verify-email
 * (the signed-in account's own email, after Google), with the matching server actions.
 * The pressed button's `intent` decides: "verify" checks the code; anything else sends one.
 */
export function EmailCodeForm({
  send,
  verify,
  next,
  fixedEmail,
  sendLabel = "Send code",
}: {
  send: (prev: CodeState, fd: FormData) => Promise<CodeState>;
  verify: (prev: CodeState, fd: FormData) => Promise<CodeState>;
  next: string;
  /** When set, the email is known (the signed-in account) and isn't typed. */
  fixedEmail?: string;
  sendLabel?: string;
}) {
  const [state, action, pending] = useActionState<CodeState, FormData>(
    (prev, fd) => (fd.get("intent") === "verify" ? verify(prev, fd) : send(prev, fd)),
    { step: "email", email: fixedEmail },
  );
  const [editing, setEditing] = useState(false);
  const onCode = state.step === "code" && !editing;
  const email = state.email ?? fixedEmail ?? "";

  return (
    <form action={action} className="space-y-3" noValidate onSubmit={() => setEditing(false)}>
      <input type="hidden" name="next" value={next} />
      <FormMessage message={state.message} />
      {!onCode ? (
        <>
          {fixedEmail ? (
            <p className="rounded-xl bg-surface-muted px-3.5 py-3 text-sm font-medium">{fixedEmail}</p>
          ) : (
            <input
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              aria-label="Email address"
              placeholder="you@example.com"
              defaultValue={email}
              className={control}
            />
          )}
          <button type="submit" disabled={pending} className={primary}>
            {pending ? "Sending…" : sendLabel}
          </button>
        </>
      ) : (
        <>
          <input type="hidden" name="email" value={email} />
          <input
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d*"
            maxLength={10}
            required
            autoFocus
            aria-label="Code from the email"
            placeholder="Enter the code"
            className={`${control} text-center text-lg font-bold tracking-[0.4em]`}
          />
          <button type="submit" name="intent" value="verify" disabled={pending} className={primary}>
            {pending ? "Checking…" : "Verify and continue"}
          </button>
          <p className="flex justify-between text-xs">
            {!fixedEmail ? (
              <button type="button" onClick={() => setEditing(true)} className="font-medium text-muted hover:text-foreground">
                Use a different email
              </button>
            ) : (
              <span />
            )}
            <button
              type="submit"
              formNoValidate
              name="intent"
              value="send"
              disabled={pending}
              className="font-medium text-accent-ink"
            >
              Send a new code
            </button>
          </p>
        </>
      )}
    </form>
  );
}
