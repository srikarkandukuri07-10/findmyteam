"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/(auth)/actions";
import { FormMessage } from "@/components/form";
import { saveLinkedin } from "./actions";

/** D26 Card 3: the LinkedIn link, saved in place. */
export function LinkedinForm({ defaultValue }: { defaultValue: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveLinkedin, {});

  return (
    <form action={action} className="space-y-3" noValidate>
      <div className="flex gap-2">
        <input
          name="linkedinUrl"
          type="url"
          inputMode="url"
          aria-label="LinkedIn profile link"
          placeholder="https://www.linkedin.com/in/your-name"
          maxLength={200}
          defaultValue={state.values?.linkedinUrl ?? defaultValue}
          aria-invalid={state.errors?.linkedinUrl ? true : undefined}
          className="block w-full rounded-xl border border-border bg-surface-muted px-3.5 py-2.5 text-sm placeholder:text-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 aria-[invalid=true]:border-danger"
        />
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded-full bg-accent px-5 text-sm font-semibold text-accent-foreground hover:bg-accent-hover disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
      {state.errors?.linkedinUrl ? (
        <p className="text-xs text-danger">{state.errors.linkedinUrl}</p>
      ) : (
        <FormMessage message={state.message} />
      )}
    </form>
  );
}
