"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field, FormMessage, Input, SubmitButton } from "@/components/form";
import { signUp, type FormState } from "../actions";

export function SignUpForm() {
  const [state, action] = useActionState<FormState, FormData>(signUp, {});

  if (state.message?.ok) {
    return (
      <div className="space-y-4">
        <FormMessage message={state.message} />
        <p className="text-sm text-muted">
          Didn&apos;t get it? Check spam, or <Link href="/login" className="font-medium text-accent-ink">log in</Link> to
          have a new link sent.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage message={state.message} />
      <Field label="Email" name="email" error={state.errors?.email}>
        <Input
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.values?.email}
          error={state.errors?.email}
        />
      </Field>
      <Field label="Password" name="password" error={state.errors?.password} hint="At least 8 characters.">
        <Input
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          error={state.errors?.password}
        />
      </Field>
      <SubmitButton pendingText="Creating account…">Create account</SubmitButton>
    </form>
  );
}
