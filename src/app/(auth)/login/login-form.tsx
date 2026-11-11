"use client";

import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Field, FormMessage, Input, SubmitButton } from "@/components/form";
import { devLogIn, signInWithGoogle, startEmailSignIn, type FormState, type StartState } from "../actions";

/** Wording for the ?error= values that /auth/confirm sends back here. */
const ERRORS: Record<string, string> = {
  not_invited: "This account isn't on the early-access list yet.",
  cancelled: "Google sign-in was cancelled. Try again, or use your email.",
  failed: "Couldn't sign you in with Google. Try again, or use your email.",
};

/** The start screen (D27): Google, or an email that gets a 6-digit code. Same flow for new and returning students. */
export function LoginOptions() {
  const params = useSearchParams();
  const next = params.get("next") ?? "";
  const error = params.get("error");

  return (
    <div className="space-y-5">
      {error && <FormMessage message={{ ok: false, text: ERRORS[error] ?? ERRORS.failed }} />}

      <form action={signInWithGoogle}>
        <input type="hidden" name="next" value={next} />
        <GoogleButton />
      </form>

      <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-wider text-muted">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>

      <EmailStart next={next} />
    </div>
  );
}

function GoogleButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full items-center justify-center gap-3 rounded-full border border-border bg-surface px-4 py-3.5 text-sm font-semibold shadow-sm transition hover:bg-surface-muted active:scale-[0.98] disabled:opacity-60"
    >
      <GoogleLogo />
      {pending ? "Opening Google…" : "Continue with Google"}
    </button>
  );
}

function EmailStart({ next }: { next: string }) {
  const [state, action, pending] = useActionState<StartState, FormData>(startEmailSignIn, {});
  return (
    <form action={action} className="space-y-3" noValidate>
      <input type="hidden" name="next" value={next} />
      <label htmlFor="email" className="block text-sm font-medium">
        Email
      </label>
      <input
        id="email"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        required
        placeholder="you@college.edu"
        defaultValue={state.email ?? ""}
        aria-invalid={state.error ? true : undefined}
        aria-describedby={state.error ? "email-error" : undefined}
        className="block w-full rounded-2xl border border-border bg-surface-muted px-4 py-3.5 text-[15px] placeholder:text-muted/70 focus:border-accent focus:bg-surface focus:outline-none focus:ring-4 focus:ring-accent/20 aria-[invalid=true]:border-danger"
      />
      {state.error && (
        <p id="email-error" role="alert" className="text-sm font-medium text-danger">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center rounded-full bg-accent px-4 py-3.5 text-sm font-bold text-accent-foreground transition hover:bg-accent-hover active:scale-[0.98] disabled:opacity-60"
      >
        {pending ? "Sending code…" : "Continue with email"}
      </button>
      <p className="text-center text-xs text-muted">We&apos;ll email you a 6-digit code. No password needed.</p>
    </form>
  );
}

/** Shown only by `next dev` (D25), for the local test accounts that have no inbox. */
export function DevLogInForm() {
  const [state, action] = useActionState<FormState, FormData>(devLogIn, {});
  const next = useSearchParams().get("next") ?? "";
  return (
    <details className="mt-6 rounded-2xl border border-dashed border-border p-4 text-sm">
      <summary className="cursor-pointer font-medium text-muted">Local test account (dev only)</summary>
      <form action={action} className="mt-4 space-y-4" noValidate>
        <input type="hidden" name="next" value={next} />
        <FormMessage message={state.message} />
        <Field label="Email" name="dev-email" error={state.errors?.email}>
          <Input name="email" id="dev-email" type="email" autoComplete="off" defaultValue={state.values?.email} error={state.errors?.email} />
        </Field>
        <Field label="Password" name="dev-password" error={state.errors?.password}>
          <Input name="password" id="dev-password" type="password" autoComplete="off" error={state.errors?.password} />
        </Field>
        <SubmitButton pendingText="Signing in…">Sign in</SubmitButton>
      </form>
    </details>
  );
}

function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
