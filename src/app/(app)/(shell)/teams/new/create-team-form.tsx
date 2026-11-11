"use client";

import { useActionState, useState } from "react";
import type { FormState } from "@/app/(auth)/actions";
import { Field, FormMessage, Input, SubmitButton } from "@/components/form";
import { ABOUT_MAX, LOOKING_FOR_MAX, TEAM_SIZE_MAX, TEAM_SIZE_MIN } from "@/lib/validation/teams";
import { createTeam } from "../actions";

const textareaClass =
  "block w-full rounded-xl border border-border bg-surface-muted px-3.5 py-2.5 text-sm placeholder:text-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 aria-[invalid=true]:border-danger";

/** D29: the five things a team needs. */
export function CreateTeamForm() {
  const [state, action] = useActionState<FormState, FormData>(createTeam, {});
  const e = state.errors ?? {};
  const v = state.values ?? {};
  const [mode, setMode] = useState(v.mode ?? "");
  const [size, setSize] = useState(Number(v.teamSize) || 4);

  return (
    <form action={action} className="space-y-6" noValidate>
      <FormMessage message={state.message} />

      <Field label="Hackathon name" name="hackathonName" error={e.hackathonName}>
        <Input
          name="hackathonName"
          defaultValue={v.hackathonName}
          maxLength={100}
          placeholder="Smart India Hackathon 2027"
          error={e.hackathonName}
          autoComplete="off"
        />
      </Field>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Mode</legend>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["online", "Online", "Build from anywhere"],
              ["offline", "Offline", "On-site at a venue"],
            ] as const
          ).map(([value, label, hint]) => (
            <label
              key={value}
              className={`cursor-pointer rounded-2xl border px-4 py-3 transition ${
                mode === value ? "border-accent bg-accent-soft" : "border-border bg-surface-muted hover:border-accent/50"
              }`}
            >
              <input
                type="radio"
                name="mode"
                value={value}
                checked={mode === value}
                onChange={() => setMode(value)}
                className="sr-only"
              />
              <span className="block text-sm font-semibold">{label}</span>
              <span className="block text-xs text-muted">{hint}</span>
            </label>
          ))}
        </div>
        {e.mode && <p className="text-xs text-danger">{e.mode}</p>}
      </fieldset>

      <Field
        label="Team size, including you"
        name="teamSize"
        error={e.teamSize}
        hint={`You'll be able to accept ${size - 1} ${size - 1 === 1 ? "person" : "people"}.`}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Fewer people"
            onClick={() => setSize((s) => Math.max(TEAM_SIZE_MIN, s - 1))}
            className="grid size-11 place-items-center rounded-full bg-chip text-xl font-bold hover:bg-accent-soft"
          >
            −
          </button>
          <input
            id="teamSize"
            name="teamSize"
            type="number"
            inputMode="numeric"
            min={TEAM_SIZE_MIN}
            max={TEAM_SIZE_MAX}
            value={size}
            onChange={(ev) => setSize(Number(ev.target.value) || TEAM_SIZE_MIN)}
            aria-invalid={e.teamSize ? true : undefined}
            className="w-20 rounded-xl border border-border bg-surface-muted px-3 py-2.5 text-center text-lg font-semibold focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
          />
          <button
            type="button"
            aria-label="More people"
            onClick={() => setSize((s) => Math.min(TEAM_SIZE_MAX, s + 1))}
            className="grid size-11 place-items-center rounded-full bg-chip text-xl font-bold hover:bg-accent-soft"
          >
            +
          </button>
          <span className="text-sm text-muted">members</span>
        </div>
      </Field>

      <Field label="What is the hackathon about?" name="about" error={e.about} hint="The theme, the track, or the problem you want to solve.">
        <textarea
          id="about"
          name="about"
          rows={4}
          maxLength={ABOUT_MAX}
          defaultValue={v.about}
          placeholder="A 36-hour agritech hackathon. We want to build an app that helps farmers get fair prices for their crops."
          aria-invalid={e.about ? true : undefined}
          className={textareaClass}
        />
      </Field>

      <Field label="Who are you looking for?" name="lookingFor" error={e.lookingFor} hint="Skills, roles, or the kind of person.">
        <textarea
          id="lookingFor"
          name="lookingFor"
          rows={3}
          maxLength={LOOKING_FOR_MAX}
          defaultValue={v.lookingFor}
          placeholder="A UI/UX designer and a backend developer who knows Node or Django. Someone who can pitch is a bonus."
          aria-invalid={e.lookingFor ? true : undefined}
          className={textareaClass}
        />
      </Field>

      <SubmitButton pendingText="Creating…">Create team</SubmitButton>
      <p className="text-center text-xs text-muted">A team chat is created with it. People you accept join the chat at once.</p>
    </form>
  );
}
