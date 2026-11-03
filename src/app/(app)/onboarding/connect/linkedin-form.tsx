"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { FormState } from "@/app/(auth)/actions";
import { Field, FormMessage, Input, SubmitButton } from "@/components/form";
import { saveLinkedinAndContinue } from "./actions";

export function LinkedinForm({ defaultValue }: { defaultValue: string }) {
  const [state, action] = useActionState<FormState, FormData>(saveLinkedinAndContinue, {});

  return (
    <form action={action} className="space-y-5" noValidate>
      <FormMessage message={state.message} />
      <Field
        label="LinkedIn profile (optional)"
        name="linkedinUrl"
        error={state.errors?.linkedinUrl}
        hint="Paste your full profile link."
      >
        <Input
          name="linkedinUrl"
          type="url"
          inputMode="url"
          placeholder="https://www.linkedin.com/in/your-name"
          maxLength={200}
          defaultValue={state.values?.linkedinUrl ?? defaultValue}
          error={state.errors?.linkedinUrl}
        />
      </Field>
      <div className="space-y-3">
        <SubmitButton pendingText="Saving…">Continue</SubmitButton>
        <p className="text-center text-sm">
          <Link href="/onboarding/profile" className="font-medium text-muted hover:text-foreground">
            Skip for now
          </Link>
        </p>
      </div>
    </form>
  );
}
