"use client";

import { useActionState, useState } from "react";
import type { FormState } from "@/app/(auth)/actions";
import { Field, FormMessage, SubmitButton } from "@/components/form";
import { RolePicker, SkillPicker } from "@/app/(app)/(shell)/profile/edit/profile-pickers";
import { BIO_MIN, INTERESTS, MAX_INTERESTS } from "@/lib/validation/onboarding";
import { BIO_MAX, type SkillLevel } from "@/lib/validation/profile";
import { saveGreatAt } from "./actions";

type Props = {
  bio: string;
  skills: { id: number; name: string; category: "technical" | "non_technical" }[];
  roles: { id: number; name: string }[];
  selectedSkills: { id: number; level: SkillLevel }[];
  selectedRoleIds: number[];
  selectedInterests: string[];
};

/** D26 Card 2: what you're great at. Skills (3+) and a bio are required; interests and roles help matching. */
export function OnboardingProfileForm({ bio, skills, roles, selectedSkills, selectedRoleIds, selectedInterests }: Props) {
  const [state, action] = useActionState<FormState, FormData>(saveGreatAt, {});
  const e = state.errors ?? {};
  const [bioText, setBioText] = useState(state.values?.bio ?? bio);
  const [interests, setInterests] = useState<string[]>(selectedInterests);
  const left = Math.max(0, BIO_MIN - bioText.trim().length);

  return (
    <form action={action} className="space-y-7" noValidate>
      <FormMessage message={state.message} />

      <div className="space-y-2">
        <h2 className="text-sm font-semibold">
          What are you best at? <span className="font-normal text-muted">Pick at least 3 and set your level.</span>
        </h2>
        <SkillPicker options={skills} initial={selectedSkills} error={e.skills} />
      </div>

      <RolePicker options={roles} initial={selectedRoleIds} error={e.roleIds} />

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">
          Interests <span className="font-normal text-muted">(optional, up to {MAX_INTERESTS})</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map((i) => {
            const on = interests.includes(i.slug);
            return (
              <button
                key={i.slug}
                type="button"
                aria-pressed={on}
                disabled={!on && interests.length >= MAX_INTERESTS}
                onClick={() => setInterests((cur) => (on ? cur.filter((x) => x !== i.slug) : [...cur, i.slug]))}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition disabled:opacity-40 ${
                  on ? "bg-accent text-accent-foreground" : "bg-chip text-foreground hover:bg-accent-soft"
                }`}
              >
                {i.label}
              </button>
            );
          })}
        </div>
        {interests.map((slug) => (
          <input key={slug} type="hidden" name="interest" value={slug} />
        ))}
        {e.interests && <p className="text-xs text-danger">{e.interests}</p>}
      </fieldset>

      <Field
        label="Bio"
        name="bio"
        error={e.bio}
        hint={
          left > 0
            ? `${left} more characters to go. Like a LinkedIn headline and summary: what you build, what you want to build next.`
            : `Looks good. Up to ${BIO_MAX} characters.`
        }
      >
        <textarea
          id="bio"
          name="bio"
          rows={5}
          maxLength={BIO_MAX}
          value={bioText}
          onChange={(ev) => setBioText(ev.target.value)}
          placeholder="Final-year CSE student who loves backend and ML. Built a crop-disease detector at my last hackathon. Looking for a designer and a pitch person to build something for healthcare."
          aria-invalid={e.bio ? true : undefined}
          className="block w-full rounded-xl border border-border bg-surface-muted px-3.5 py-2.5 text-sm placeholder:text-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
        />
      </Field>

      <SubmitButton pendingText="Saving…">Continue</SubmitButton>
    </form>
  );
}
