import { z } from "zod";

/** Bump when the waitlist consent text on the landing page changes. */
export const WAITLIST_CONSENT_VERSION = "waitlist-2026-11-05";

const id = z.coerce.number().int().positive().max(32767);
const optionalId = z.preprocess((v) => (v === "" || v === "other" ? undefined : v), id.optional());

/** WAIT-1: what the landing-page form sends. `college` is an id or "other" with `collegeOther` filled in. */
export const waitlistSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your name.").max(80, "Keep it under 80 characters."),
    email: z.string().trim().toLowerCase().max(254).pipe(z.email("Enter a valid email.")),
    college: z.string().min(1, "Pick your college."),
    collegeOther: z.string().trim().max(120, "Keep it under 120 characters.").optional().default(""),
    branch: optionalId,
    year: z.coerce.number({ error: "Pick your year." }).int().min(1, "Pick your year.").max(5, "Pick your year."),
    roles: z.array(id).max(6, "Pick up to 6.").default([]),
    painPoint: z.string().trim().max(300, "Keep it under 300 characters.").optional().default(""),
    btech: z.literal("on", { error: "This waitlist is for B.Tech and B.E. students." }),
    consent: z.literal("on", { error: "Please agree so we can contact you at launch." }),
    ref: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9]{8}$/)
      .optional()
      .catch(undefined),
    source: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9_-]{1,40}$/)
      .optional()
      .catch(undefined),
  })
  .superRefine((v, ctx) => {
    if (v.college === "other") {
      if (v.collegeOther.length < 2) ctx.addIssue({ code: "custom", path: ["collegeOther"], message: "Type your college's name." });
    } else if (!/^\d+$/.test(v.college)) {
      ctx.addIssue({ code: "custom", path: ["college"], message: "Pick your college." });
    }
  });

export type WaitlistInput = z.infer<typeof waitlistSchema>;

export const joinResultSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("joined"), code: z.string(), position: z.number(), referrals: z.number() }),
  z.object({ status: z.literal("already") }),
  z.object({ status: z.literal("limit") }),
  z.object({ status: z.literal("invalid") }),
]);

export const standingSchema = z.object({ code: z.string(), position: z.number(), referrals: z.number() });
export type Standing = z.infer<typeof standingSchema>;

/** "1st", "2nd", "23rd", "111th". */
export function ordinal(n: number) {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  return `${n}${{ 1: "st", 2: "nd", 3: "rd" }[n % 10] ?? "th"}`;
}

/** The message friends receive with someone's invite link. */
export function inviteMessage(url: string) {
  return `I just joined the FindMyTeam waitlist: find hackathon teammates from other colleges, not just your friend circle. Join with my link: ${url}`;
}
