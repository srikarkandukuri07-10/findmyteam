"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Checkbox, Field, FormMessage, Input, Select } from "@/components/form";
import type { FormState } from "@/app/(auth)/actions";
import { saveDetails } from "./actions";

type Option = { id: number; name: string };

export type DetailsDefaults = {
  displayName: string;
  email: string;
  phone: string;
  college: string;
  degree: string;
  branchId: string;
  yearOfStudy: string;
  graduationYear: string;
  birthYear: string;
};

const FORM_ID = "details-form";

/** D26 Card 1, part one: who you are and where you study. The college-email badge sits below it. */
export function DetailsForm({
  branches,
  currentYear,
  defaults,
  children,
}: {
  branches: Option[];
  currentYear: number;
  defaults: DetailsDefaults;
  /** Rendered between the form fields and the Continue button (the optional college-email block). */
  children?: React.ReactNode;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveDetails, {});
  const v = state.values ?? {};
  const e = state.errors ?? {};
  const gradYears = Array.from({ length: 7 }, (_, i) => currentYear + i);

  return (
    <div className="space-y-6">
      <form id={FORM_ID} action={action} className="space-y-5" noValidate>
        <FormMessage message={state.message} />

        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">About you</h2>
          <Field label="Full name" name="displayName" error={e.displayName} hint="Shown on your profile.">
            <Input name="displayName" autoComplete="name" required defaultValue={v.displayName ?? defaults.displayName} error={e.displayName} />
          </Field>
          <Field label="Email" name="email" hint="From your Google account. Never shown to other students.">
            <Input name="email" type="email" value={defaults.email} readOnly disabled />
          </Field>
          <Field
            label="Mobile number"
            name="phone"
            error={e.phone}
            hint="Private. Nobody on FindMyTeam can see it; share it in a chat only if you want to."
          >
            <div className="flex">
              <span className="grid place-items-center rounded-l-xl border border-r-0 border-border bg-chip px-3 text-sm font-semibold text-muted">
                +91
              </span>
              <input
                id="phone"
                name="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="98765 43210"
                required
                defaultValue={v.phone ?? defaults.phone.replace(/^\+91/, "")}
                aria-invalid={e.phone ? true : undefined}
                className="block w-full rounded-r-xl border border-border bg-surface-muted px-3.5 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 aria-[invalid=true]:border-danger"
              />
            </div>
          </Field>
        </section>

        <section className="space-y-4 border-t border-border pt-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Your college</h2>
          <Field label="College or university" name="college" error={e.college} hint="Your full college name, e.g. Chaitanya Bharathi Institute of Technology.">
            <Input
              name="college"
              autoComplete="organization"
              maxLength={120}
              placeholder="Type your college or university"
              required
              defaultValue={v.college ?? defaults.college}
              error={e.college}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Degree" name="degree" error={e.degree}>
              <Select name="degree" required defaultValue={v.degree ?? defaults.degree} error={e.degree}>
                <option value="" disabled>
                  Select degree
                </option>
                <option value="btech">B.Tech</option>
                <option value="be">B.E.</option>
              </Select>
            </Field>
            <Field label="Branch" name="branchId" error={e.branchId}>
              <Select name="branchId" required defaultValue={v.branchId ?? defaults.branchId} error={e.branchId}>
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
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Year of study" name="yearOfStudy" error={e.yearOfStudy}>
              <Select name="yearOfStudy" required defaultValue={v.yearOfStudy ?? defaults.yearOfStudy} error={e.yearOfStudy}>
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
              <Select name="graduationYear" required defaultValue={v.graduationYear ?? defaults.graduationYear} error={e.graduationYear}>
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
                defaultValue={v.birthYear ?? defaults.birthYear}
                error={e.birthYear}
              />
            </Field>
          </div>
        </section>
      </form>

      {children}

      <div className="space-y-4 border-t border-border pt-5">
        <Checkbox form={FORM_ID} name="confirmDegree" defaultChecked={v.confirmDegree === "on"} error={e.confirmDegree}>
          I am currently pursuing a B.Tech or B.E. degree.
        </Checkbox>
        <Checkbox form={FORM_ID} name="acceptTerms" defaultChecked={v.acceptTerms === "on"} error={e.acceptTerms}>
          I accept the{" "}
          <Link href="/terms" target="_blank" className="font-medium text-accent-ink">
            terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" target="_blank" className="font-medium text-accent-ink">
            privacy notice
          </Link>
          .
        </Checkbox>
        <button
          type="submit"
          form={FORM_ID}
          disabled={pending}
          className="flex w-full items-center justify-center rounded-full bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground transition hover:bg-accent-hover active:scale-[0.98] disabled:opacity-60"
        >
          {pending ? "Saving…" : "Continue"}
        </button>
      </div>
    </div>
  );
}
