"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Checkbox, Field, FormMessage, Input, Select, SubmitButton } from "@/components/form";
import type { FormState } from "@/app/(auth)/actions";
import { completeOnboarding } from "./actions";

type Option = { id: number; name: string };

export function OnboardingForm({
  colleges,
  branches,
  currentYear,
}: {
  colleges: Option[];
  branches: Option[];
  currentYear: number;
}) {
  const [state, action] = useActionState<FormState, FormData>(completeOnboarding, {});
  const v = state.values ?? {};
  const e = state.errors ?? {};
  const [college, setCollege] = useState(v.collegeId ?? "");
  const gradYears = Array.from({ length: 7 }, (_, i) => currentYear + i);

  return (
    <form action={action} className="space-y-5" noValidate>
      <FormMessage message={state.message} />

      <Field label="Full name" name="displayName" error={e.displayName} hint="Shown on your profile.">
        <Input name="displayName" autoComplete="name" required defaultValue={v.displayName} error={e.displayName} />
      </Field>

      <Field label="Degree" name="degree" error={e.degree}>
        <Select name="degree" required defaultValue={v.degree ?? ""} error={e.degree}>
          <option value="" disabled>
            Select degree
          </option>
          <option value="btech">B.Tech</option>
          <option value="be">B.E.</option>
        </Select>
      </Field>

      <Field label="College" name="collegeId" error={e.collegeId}>
        <Select
          name="collegeId"
          required
          value={college}
          onChange={(ev) => setCollege(ev.target.value)}
          error={e.collegeId}
        >
          <option value="" disabled>
            Select your college
          </option>
          {colleges.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
          <option value="other">My college isn&apos;t listed</option>
        </Select>
      </Field>

      {college === "other" && (
        <Field label="College name" name="collegeOther" error={e.collegeOther}>
          <Input name="collegeOther" required defaultValue={v.collegeOther} error={e.collegeOther} />
        </Field>
      )}

      <Field label="Branch" name="branchId" error={e.branchId}>
        <Select name="branchId" required defaultValue={v.branchId ?? ""} error={e.branchId}>
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

      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Year of study" name="yearOfStudy" error={e.yearOfStudy}>
          <Select name="yearOfStudy" required defaultValue={v.yearOfStudy ?? ""} error={e.yearOfStudy}>
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
          <Select name="graduationYear" required defaultValue={v.graduationYear ?? ""} error={e.graduationYear}>
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
        <Field label="Birth year" name="birthYear" error={e.birthYear}>
          <Input
            name="birthYear"
            type="number"
            inputMode="numeric"
            placeholder="e.g. 2006"
            required
            defaultValue={v.birthYear}
            error={e.birthYear}
          />
        </Field>
      </div>

      <div className="space-y-3 border-t border-border pt-5">
        <Checkbox name="confirmDegree" defaultChecked={v.confirmDegree === "on"} error={e.confirmDegree}>
          I am currently pursuing a B.Tech or B.E. degree.
        </Checkbox>
        <Checkbox name="acceptTerms" defaultChecked={v.acceptTerms === "on"} error={e.acceptTerms}>
          I accept the{" "}
          <Link href="/terms" target="_blank" className="font-medium text-accent">
            terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" target="_blank" className="font-medium text-accent">
            privacy notice
          </Link>
          .
        </Checkbox>
      </div>

      <SubmitButton pendingText="Saving…">Continue</SubmitButton>
    </form>
  );
}
