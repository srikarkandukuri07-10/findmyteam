"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/(auth)/actions";
import { Field, FormMessage, Input, Select, SubmitButton } from "@/components/form";
import { BIO_MAX, type SkillLevel } from "@/lib/validation/profile";
import { saveProfile } from "../actions";
import { RolePicker, SkillPicker } from "./profile-pickers";

type Props = {
  profile: {
    display_name: string | null;
    bio: string | null;
    linkedin_url: string | null;
    branch_id: number | null;
    year_of_study: number | null;
    graduation_year: number | null;
  };
  branches: { id: number; name: string }[];
  skills: { id: number; name: string; category: "technical" | "non_technical" }[];
  roles: { id: number; name: string }[];
  selectedSkills: { id: number; level: SkillLevel }[];
  selectedRoleIds: number[];
  currentYear: number;
};

export function ProfileForm({ profile, branches, skills, roles, selectedSkills, selectedRoleIds, currentYear }: Props) {
  const [state, action] = useActionState<FormState, FormData>(saveProfile, {});
  const e = state.errors ?? {};
  // After a failed save the server echoes what was typed; otherwise show what is stored.
  const v = (key: string, stored: string | number | null) => state.values?.[key] ?? (stored == null ? "" : String(stored));
  const gradYears = Array.from({ length: 8 }, (_, i) => currentYear - 1 + i);

  return (
    <form action={action} className="space-y-8" noValidate>
      <FormMessage message={state.message} />

      <section className="space-y-5">
        <h2 className="text-lg font-semibold tracking-tight">About you</h2>
        <Field label="Full name" name="displayName" error={e.displayName}>
          <Input name="displayName" required defaultValue={v("displayName", profile.display_name)} error={e.displayName} />
        </Field>
        <Field label="Bio" name="bio" error={e.bio} hint={`Up to ${BIO_MAX} characters. What do you build, and what do you want to build next?`}>
          <textarea
            id="bio"
            name="bio"
            rows={4}
            maxLength={BIO_MAX}
            defaultValue={v("bio", profile.bio)}
            aria-invalid={e.bio ? true : undefined}
            className="block w-full rounded-xl border border-border bg-surface-muted px-3.5 py-2.5 text-sm placeholder:text-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
          />
        </Field>
      </section>

      <section className="space-y-5">
        <h2 className="text-lg font-semibold tracking-tight">Studies</h2>
        <Field label="Branch" name="branchId" error={e.branchId}>
          <Select name="branchId" required defaultValue={v("branchId", profile.branch_id)} error={e.branchId}>
            <option value="" disabled>
              Select your branch
            </option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Year of study" name="yearOfStudy" error={e.yearOfStudy}>
            <Select name="yearOfStudy" required defaultValue={v("yearOfStudy", profile.year_of_study)} error={e.yearOfStudy}>
              <option value="" disabled>
                Year
              </option>
              {[1, 2, 3, 4, 5].map((y) => (
                <option key={y} value={y}>
                  Year {y}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Graduating in" name="graduationYear" error={e.graduationYear}>
            <Select
              name="graduationYear"
              required
              defaultValue={v("graduationYear", profile.graduation_year)}
              error={e.graduationYear}
            >
              <option value="" disabled>
                Year
              </option>
              {gradYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </section>

      <section className="space-y-5">
        <h2 className="text-lg font-semibold tracking-tight">What you bring</h2>
        <SkillPicker options={skills} initial={selectedSkills} error={e.skills} />
        <RolePicker options={roles} initial={selectedRoleIds} error={e.roleIds} />
      </section>

      <section className="space-y-5">
        <h2 className="text-lg font-semibold tracking-tight">Links</h2>
        <Field label="LinkedIn profile (optional)" name="linkedinUrl" error={e.linkedinUrl} hint="Paste your full profile link.">
          <Input
            name="linkedinUrl"
            type="url"
            inputMode="url"
            placeholder="https://www.linkedin.com/in/your-name"
            maxLength={200}
            defaultValue={v("linkedinUrl", profile.linkedin_url)}
            error={e.linkedinUrl}
          />
        </Field>
      </section>

      <SubmitButton pendingText="Saving…">Save profile</SubmitButton>
    </form>
  );
}
