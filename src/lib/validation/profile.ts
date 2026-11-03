import { z } from "zod";
import { blankToUndefined, requiredInt } from "./common";

export const MAX_SKILLS = 15;
export const MAX_ROLES = 3;
export const BIO_MAX = 500;

export const SKILL_LEVELS = ["beginner", "intermediate", "advanced"] as const;
export type SkillLevel = (typeof SKILL_LEVELS)[number];

export const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

// Same rules as the database checks, so errors show next to the field instead of as a failed save.
const GITHUB_USERNAME = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;
const LINKEDIN_URL = /^https:\/\/([a-z]{2,3}\.)?linkedin\.com\/in\/[^\s/?#]{3,100}\/?$/i;

function optional(schema: z.ZodType<string>) {
  return z.preprocess(blankToUndefined, schema.optional());
}

/** Builds the profile schema relative to `now` so the graduation-year range stays current. */
export function profileSchema(now: Date = new Date()) {
  const year = now.getFullYear();
  return z.object({
    displayName: z
      .string({ error: "Enter your name (at least 2 characters)." })
      .trim()
      .min(2, { error: "Enter your name (at least 2 characters)." })
      .max(60, { error: "Keep your name under 60 characters." }),
    bio: optional(
      z
        .string()
        .trim()
        .max(BIO_MAX, { error: `Keep your bio under ${BIO_MAX} characters.` }),
    ),
    githubUsername: optional(
      z
        .string()
        .trim()
        .regex(GITHUB_USERNAME, { error: "Enter just your GitHub username, for example octocat." }),
    ),
    linkedinUrl: optional(
      z
        .string()
        .trim()
        .regex(LINKEDIN_URL, { error: "Enter your profile link, like https://www.linkedin.com/in/your-name" }),
    ),
    branchId: requiredInt("Select your branch.").pipe(z.number().positive({ error: "Select your branch." })),
    yearOfStudy: requiredInt("Select your year of study.").pipe(
      z.number().min(1, { error: "Select your year of study." }).max(5, { error: "Select your year of study." }),
    ),
    // Allow last year too, so someone whose year just passed can still edit their profile.
    graduationYear: requiredInt("Select your graduation year.").pipe(
      z
        .number()
        .min(year - 1, { error: `Graduation year must be ${year - 1} or later.` })
        .max(year + 6, { error: `Graduation year must be ${year + 6} or earlier.` }),
    ),
    skills: z
      .array(
        z.object({
          id: z.number().int().positive(),
          level: z.enum(SKILL_LEVELS),
        }),
        { error: "Check your skills and try again." },
      )
      .max(MAX_SKILLS, { error: `Pick at most ${MAX_SKILLS} skills.` }),
    roleIds: z
      .array(z.number().int().positive(), { error: "Check your roles and try again." })
      .max(MAX_ROLES, { error: `Pick at most ${MAX_ROLES} roles.` }),
  });
}

export type ProfileInput = z.infer<ReturnType<typeof profileSchema>>;

/** Turns the form's repeated `skill` fields ("12:advanced") into objects for the schema. */
export function skillsFromForm(values: FormDataEntryValue[]) {
  return values
    .filter((v): v is string => typeof v === "string")
    .map((v) => {
      const [id, level] = v.split(":");
      return { id: Number(id), level };
    });
}

export function rolesFromForm(values: FormDataEntryValue[]) {
  return values.filter((v): v is string => typeof v === "string").map(Number);
}

export function githubProfileUrl(username: string) {
  return `https://github.com/${encodeURIComponent(username)}`;
}

export function initials(name: string | null | undefined) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : "";
  return (first + last).toUpperCase();
}
