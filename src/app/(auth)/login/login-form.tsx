"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { Field, FormMessage, Input, SubmitButton } from "@/components/form";
import { logIn, type FormState } from "../actions";

export function LogInForm() {
  const [state, action] = useActionState<FormState, FormData>(logIn, {});
  const next = useSearchParams().get("next") ?? "";

  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />
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
      <Field label="Password" name="password" error={state.errors?.password}>
        <Input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          error={state.errors?.password}
        />
      </Field>
      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-sm text-accent-ink">
          Forgot password?
        </Link>
      </div>
      <SubmitButton pendingText="Logging in…">Log in</SubmitButton>
    </form>
  );
}
