"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { Field, FormMessage, Input, Select, SubmitButton } from "@/components/form";
import { createClient } from "@/lib/supabase/client";
import { formatDateRange } from "@/lib/hackathons/dates";
import type { FormState } from "@/app/(auth)/actions";
import { createHackathon } from "../actions";

type Similar = { id: string; name: string; starts_on: string };

export function NewHackathonForm() {
  const [state, action] = useActionState<FormState, FormData>(createHackathon, {});
  const v = state.values ?? {};
  const e = state.errors ?? {};
  const [similar, setSimilar] = useState<Similar[]>([]);
  const lastChecked = useRef("");

  /** HACK-2: warn about near-duplicate names before the user submits. */
  async function checkSimilar(name: string) {
    const trimmed = name.trim();
    if (trimmed.length < 3 || trimmed === lastChecked.current) return;
    lastChecked.current = trimmed;
    const { data } = await createClient().rpc("similar_hackathons", { p_name: trimmed });
    setSimilar(data ?? []);
  }

  return (
    <form action={action} className="space-y-5" noValidate>
      <FormMessage message={state.message} />

      <Field label="Name" name="name" error={e.name} hint="Include the year or edition, e.g. “Smart India Hackathon 2026”.">
        <Input
          name="name"
          required
          maxLength={120}
          defaultValue={v.name}
          error={e.name}
          onBlur={(ev) => checkSimilar(ev.target.value)}
        />
      </Field>

      {similar.length > 0 && (
        <div role="status" className="rounded-2xl bg-sand p-4 text-sm">
          <p className="font-medium">Already listed? These look similar:</p>
          <ul className="mt-2 space-y-1">
            {similar.map((s) => (
              <li key={s.id}>
                <Link href={`/hackathons/${s.id}`} className="font-medium text-accent-ink underline-offset-2 hover:underline">
                  {s.name}
                </Link>{" "}
                <span className="text-muted">({formatDateRange(s.starts_on, s.starts_on)})</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Field label="Organizer (optional)" name="organizer" error={e.organizer}>
        <Input name="organizer" maxLength={120} defaultValue={v.organizer} error={e.organizer} />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="How is it held?" name="mode" error={e.mode}>
          <Select name="mode" required defaultValue={v.mode ?? ""} error={e.mode}>
            <option value="" disabled>
              Select
            </option>
            <option value="in_person">In person</option>
            <option value="online">Online</option>
            <option value="hybrid">Hybrid</option>
          </Select>
        </Field>
        <Field label="City (optional)" name="city" error={e.city}>
          <Input name="city" maxLength={80} defaultValue={v.city} error={e.city} />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Starts on" name="startsOn" error={e.startsOn}>
          <Input name="startsOn" type="date" required defaultValue={v.startsOn} error={e.startsOn} />
        </Field>
        <Field label="Ends on" name="endsOn" error={e.endsOn}>
          <Input name="endsOn" type="date" required defaultValue={v.endsOn} error={e.endsOn} />
        </Field>
      </div>

      <Field label="Official link (optional)" name="url" error={e.url}>
        <Input
          name="url"
          type="url"
          inputMode="url"
          placeholder="https://"
          maxLength={300}
          defaultValue={v.url}
          error={e.url}
        />
      </Field>

      <SubmitButton pendingText="Adding…">Add hackathon</SubmitButton>
    </form>
  );
}
