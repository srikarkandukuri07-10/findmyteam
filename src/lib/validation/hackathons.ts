import { z } from "zod";
import { daysBetween, isValidIsoDate } from "@/lib/hackathons/dates";

/** Longest hackathon we accept (some run for a month). Guards against typos like the wrong year. */
export const MAX_HACKATHON_DAYS = 62;

function isoDate(label: string) {
  return z
    .string({ error: `Enter the ${label} date.` })
    // Checks keep running after a failure, so the later ones must cope with bad input like "".
    .refine((v) => /^\d{4}-\d{2}-\d{2}$/.test(v), { error: `Enter the ${label} date.`, abort: true })
    .refine(isValidIsoDate, { error: `Enter a real ${label} date.`, abort: true })
    .refine((v) => v >= "2015-01-01" && v <= "2035-12-31", { error: `Check the year of the ${label} date.` });
}

export const hackathonSchema = z
  .object({
    name: z
      .string({ error: "Enter the hackathon's name." })
      .trim()
      .min(3, { error: "The name must be at least 3 characters." })
      .max(120, { error: "The name must be at most 120 characters." }),
    mode: z.enum(["online", "in_person", "hybrid"], { error: "Select how it is held." }),
    city: z
      .string({ error: "Enter the city." })
      .trim()
      .min(2, { error: "Enter the city." })
      .max(80, { error: "City must be at most 80 characters." }),
    startsOn: isoDate("start"),
    endsOn: isoDate("end"),
    url: z.preprocess(
      (v) => (typeof v === "string" ? v.trim() : v),
      z
        .url({ protocol: /^https?$/, error: "Enter the official link, starting with http:// or https://" })
        .max(300, { error: "The link is too long." }),
    ),
  })
  .superRefine((v, ctx) => {
    if (v.endsOn < v.startsOn) {
      ctx.addIssue({ code: "custom", path: ["endsOn"], message: "The end date can't be before the start date." });
    } else if (daysBetween(v.startsOn, v.endsOn) > MAX_HACKATHON_DAYS) {
      ctx.addIssue({
        code: "custom",
        path: ["endsOn"],
        message: `A hackathon can last at most ${MAX_HACKATHON_DAYS} days. Check the dates.`,
      });
    }
  });

export type HackathonInput = z.infer<typeof hackathonSchema>;

/** Search text from the URL: trimmed and capped, so a long query can't be sent to the database. */
export function cleanSearchQuery(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return (value ?? "").trim().slice(0, 80);
}
