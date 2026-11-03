import { z } from "zod";

/** Bump when the terms or privacy notice change; stored with each user's consent. */
export const CONSENT_VERSION = "2026-11-03";

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Enter a valid email address." }));

// Supabase hashes with bcrypt, which ignores bytes past 72.
const password = z
  .string()
  .min(8, { error: "Use at least 8 characters." })
  .max(72, { error: "Use at most 72 characters." });

export const signUpSchema = z.object({ email, password });

export const logInSchema = z.object({
  email,
  password: z.string().min(1, { error: "Enter your password." }),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({ password, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, {
    error: "Passwords don't match.",
    path: ["confirmPassword"],
  });

/** Empty form values become `undefined` so "required" errors read naturally. */
const blankToUndefined = (v: unknown) => (v === "" || v == null ? undefined : v);

/** A required whole number from a form field, with one message for missing or invalid input. */
function requiredInt(message: string) {
  return z.preprocess(blankToUndefined, z.coerce.number({ error: message }).int({ error: message }));
}

/** Builds the onboarding schema relative to `now` so year ranges stay current. */
export function onboardingSchema(now: Date = new Date()) {
  const year = now.getFullYear();

  return z
    .object({
      displayName: z
        .string({ error: "Enter your name (at least 2 characters)." })
        .trim()
        .min(2, { error: "Enter your name (at least 2 characters)." })
        .max(60, { error: "Keep your name under 60 characters." }),
      degree: z.enum(["btech", "be"], { error: "Select your degree." }),
      // A college id from the list, or "other" with the name typed into collegeOther.
      collegeId: z.preprocess(
        blankToUndefined,
        z.union([z.literal("other"), z.coerce.number().int().positive()], { error: "Select your college." }),
      ),
      collegeOther: z.string().trim().max(120).optional().default(""),
      branchId: requiredInt("Select your branch.").pipe(z.number().positive({ error: "Select your branch." })),
      yearOfStudy: requiredInt("Select your year of study.").pipe(
        z.number().min(1, { error: "Select your year of study." }).max(5, { error: "Select your year of study." }),
      ),
      graduationYear: requiredInt("Select your graduation year.").pipe(
        z
          .number()
          .min(year, { error: `Graduation year must be ${year} or later.` })
          .max(year + 6, { error: `Graduation year must be ${year + 6} or earlier.` }),
      ),
      birthYear: requiredInt("Enter your birth year.").pipe(
        z
          .number()
          .min(year - 40, { error: "Enter a valid birth year." })
          .max(year - 14, { error: "Enter a valid birth year." }),
      ),
      confirmDegree: z.literal("on", {
        error: "Confirm that you are currently pursuing a B.Tech or B.E.",
      }),
      acceptTerms: z.literal("on", {
        error: "Accept the terms and privacy notice to continue.",
      }),
    })
    .superRefine((v, ctx) => {
      if (v.collegeId === "other" && v.collegeOther.length < 3) {
        ctx.addIssue({
          code: "custom",
          path: ["collegeOther"],
          message: "Enter your college's full name.",
        });
      }
    });
}

export type OnboardingInput = z.infer<ReturnType<typeof onboardingSchema>>;

/** Field name -> first error message, for showing next to form inputs. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}
