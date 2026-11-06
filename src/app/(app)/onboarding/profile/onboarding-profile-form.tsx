"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { FormState } from "@/app/(auth)/actions";
import { Field, FormMessage, SubmitButton } from "@/components/form";
import { RolePicker, SkillPicker } from "@/app/(app)/(shell)/profile/edit/profile-pickers";
import { BIO_MAX, type SkillLevel } from "@/lib/validation/profile";
import { saveOnboardingProfile } from "./actions";

type Props = {
  bio: string;
  skills: { id: number; name: string; category: "technical" | "non_technical" }[];
  roles: { id: number; name: string }[];
  selectedSkills: { id: number; level: SkillLevel }[];
  selectedRoleIds: number[];
};

export function OnboardingProfileForm({ bio, skills, roles, selectedSkills, selectedRoleIds }: Props) {
  const [state, action] = useActionState<FormState, FormData>(saveOnboardingProfile, {});
  const e = state.errors ?? {};

  return (
    <form action={action} className="space-y-6" noValidate>
      <FormMessage message={state.message} />

      <Field label="Bio" name="bio" error={e.bio} hint={`Up to ${BIO_MAX} characters. What do you build, and what do you want to build next?`}>
        <textarea
          id="bio"
          name="bio"
          rows={4}
          maxLength={BIO_MAX}
          defaultValue={state.values?.bio ?? bio}
          aria-invalid={e.bio ? true : undefined}
          className="block w-full rounded-xl border border-border bg-surface-muted px-3.5 py-2.5 text-sm placeholder:text-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
        />
      </Field>

      <SkillPicker options={skills} initial={selectedSkills} error={e.skills} />
      <RolePicker options={roles} initial={selectedRoleIds} error={e.roleIds} />

      <div className="space-y-3">
        <SubmitButton pendingText="Saving…">Finish setup</SubmitButton>
        <p className="text-center text-sm">
          <Link href="/home" className="font-medium text-muted hover:text-foreground">
            Skip for now
          </Link>
        </p>
      </div>
    </form>
  );
}
