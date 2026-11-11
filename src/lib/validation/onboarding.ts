import { z } from "zod";
import { blankToUndefined, requiredInt } from "./common";
import { BIO_MAX, MAX_ROLES, MAX_SKILLS, SKILL_LEVELS } from "./profile";

/** Interests a student can pick on Card 2 (D26). Must match the database check on profiles.interests. */
export const INTERESTS = [
  { slug: "ai-ml", label: "AI / ML" },
  { slug: "web3", label: "Web3" },
  { slug: "fintech", label: "FinTech" },
  { slug: "healthtech", label: "HealthTech" },
  { slug: "edtech", label: "EdTech" },
  { slug: "climate", label: "Climate" },
  { slug: "agritech", label: "AgriTech" },
  { slug: "mobility", label: "Mobility" },
  { slug: "gaming", label: "Gaming" },
  { slug: "social-impact", label: "Social impact" },
  { slug: "hardware-iot", label: "Hardware / IoT" },
  { slug: "robotics", label: "Robotics" },
  { slug: "space", label: "Space tech" },
  { slug: "cybersecurity", label: "Cybersecurity" },
  { slug: "open-source", label: "Open source" },
  { slug: "design", label: "Design" },
] as const;
export const INTEREST_SLUGS = INTERESTS.map((i) => i.slug) as [string, ...string[]];
export const MAX_INTERESTS = 8;
export const BIO_MIN = 40;

/** An Indian mobile number in any common format; returned as +91XXXXXXXXXX. */
export const phoneField = z
  .string({ error: "Enter your mobile number." })
  .transform((v) => v.replace(/[\s()-]/g, ""))
  .transform((v) => (/^[6-9]\d{9}$/.test(v) ? `+91${v}` : /^91[6-9]\d{9}$/.test(v) ? `+${v}` : v))
  .pipe(z.string().regex(/^\+91[6-9]\d{9}$/, { error: "Enter a valid 10-digit Indian mobile number." }));

/** Card 1: you and your college. */
export function detailsSchema(now: Date = new Date()) {
  const year = now.getFullYear();
  return z.object({
    displayName: z
      .string({ error: "Enter your name (at least 2 characters)." })
      .trim()
      .min(2, { error: "Enter your name (at least 2 characters)." })
      .max(60, { error: "Keep your name under 60 characters." }),
    phone: phoneField,
    collegeId: z.preprocess(blankToUndefined, z.coerce.number({ error: "Pick your college from the list." }).int().positive({ error: "Pick your college from the list." })),
    degree: z.enum(["btech", "be"], { error: "Select your degree." }),
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
      z.number().min(year - 40, { error: "Enter a valid birth year." }).max(year - 14, { error: "Enter a valid birth year." }),
    ),
    confirmDegree: z.literal("on", { error: "Confirm that you are currently pursuing a B.Tech or B.E." }),
    acceptTerms: z.literal("on", { error: "Accept the terms and privacy notice to continue." }),
  });
}

const skillEntry = z.object({ id: z.number().int().positive(), level: z.enum(SKILL_LEVELS) });

/** Card 2: what you're great at. Bio and three skills are required. */
export const greatAtSchema = z.object({
  bio: z
    .string()
    .trim()
    .min(BIO_MIN, { error: `Write at least ${BIO_MIN} characters about yourself.` })
    .max(BIO_MAX, { error: `Keep your bio under ${BIO_MAX} characters.` }),
  skills: z
    .array(skillEntry)
    .min(3, { error: "Pick at least 3 skills you're strongest at." })
    .max(MAX_SKILLS, { error: `Pick at most ${MAX_SKILLS} skills.` }),
  roleIds: z.array(z.number().int().positive()).max(MAX_ROLES, { error: `Pick at most ${MAX_ROLES} roles.` }),
  interests: z.array(z.enum(INTEREST_SLUGS)).max(MAX_INTERESTS, { error: `Pick at most ${MAX_INTERESTS} interests.` }),
});

const httpsUrl = z.preprocess(
  blankToUndefined,
  z
    .string()
    .trim()
    .max(300, { error: "Keep the link under 300 characters." })
    .regex(/^https:\/\/[^\s]+\.[^\s]+$/i, { error: "Use a full https:// link." })
    .optional(),
);

/** Card 3 / profile: a hackathon the student took part in. */
export function pastHackathonSchema(now: Date = new Date()) {
  return z.object({
    name: z.string().trim().min(3, { error: "Enter the hackathon's name." }).max(100, { error: "Keep the name under 100 characters." }),
    year: requiredInt("Pick the year.").pipe(
      z.number().min(2010, { error: "Pick the year." }).max(now.getFullYear(), { error: "That year hasn't happened yet." }),
    ),
    result: z.enum(["participated", "finalist", "winner"], { error: "Pick how it went." }),
    idea: z.preprocess(blankToUndefined, z.string().trim().max(400, { error: "Keep the idea under 400 characters." }).optional()),
    liveUrl: httpsUrl,
    demoUrl: httpsUrl,
  });
}

export const RESULT_LABELS = { participated: "Participated", finalist: "Finalist", winner: "Winner" } as const;
