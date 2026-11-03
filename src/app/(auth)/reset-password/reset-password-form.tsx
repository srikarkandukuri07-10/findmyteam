"use client";

import { useActionState } from "react";
import { Field, FormMessage, Input, SubmitButton } from "@/components/form";
import { resetPassword, type FormState } from "../actions";

export function ResetPasswordForm() {
  const [state, action] = useActionState<FormState, FormData>(resetPassword, {});

  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage message={state.message} />
      <Field label="New password" name="password" error={state.errors?.password} hint="At least 8 characters.">
        <Input
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          error={state.errors?.password}
        />
      </Field>
      <Field label="Confirm new password" name="confirmPassword" error={state.errors?.confirmPassword}>
        <Input
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          error={state.errors?.confirmPassword}
        />
      </Field>
      <SubmitButton pendingText="Saving…">Save new password</SubmitButton>
    </form>
  );
}
