"use client";

import { useActionState } from "react";
import { Field, FormMessage, Input, SubmitButton } from "@/components/form";
import { requestPasswordReset, type FormState } from "../actions";

export function ForgotPasswordForm() {
  const [state, action] = useActionState<FormState, FormData>(requestPasswordReset, {});

  if (state.message?.ok) return <FormMessage message={state.message} />;

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
      <SubmitButton pendingText="Sending…">Send reset link</SubmitButton>
    </form>
  );
}
