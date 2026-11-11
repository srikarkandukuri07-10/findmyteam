import { z } from "zod";
import { requiredInt } from "./common";

export const MAX_ACTIVE_TEAMS = 3;
export const TEAM_SIZE_MIN = 2;
export const TEAM_SIZE_MAX = 10;
export const ABOUT_MAX = 1000;
export const LOOKING_FOR_MAX = 500;
export const JOIN_NOTE_MAX = 300;

/** D29: the create-team form. Mirrors the checks in create_team(). */
export const createTeamSchema = z.object({
  hackathonName: z
    .string({ error: "Enter the hackathon's name." })
    .transform((v) => v.replace(/\s+/g, " ").trim())
    .pipe(
      z
        .string()
        .min(3, { error: "Enter the hackathon's name." })
        .max(100, { error: "Keep the name under 100 characters." }),
    ),
  hackathonUrl: z
    .string({ error: "Paste the hackathon's official link." })
    .trim()
    .transform((v) => (v && !/^https?:\/\//i.test(v) ? `https://${v}` : v))
    .pipe(
      z
        .string()
        .min(1, { error: "Paste the hackathon's official link." })
        .max(300, { error: "Keep the link under 300 characters." })
        .regex(/^https?:\/\/[^\s/?#]+\.[^\s]+$/i, { error: "Paste a full link, like https://sih.gov.in" }),
    ),
  mode: z.enum(["online", "offline"], { error: "Pick online or offline." }),
  teamSize: requiredInt("Pick how many people the team needs.").pipe(
    z
      .number()
      .min(TEAM_SIZE_MIN, { error: `A team needs at least ${TEAM_SIZE_MIN} people.` })
      .max(TEAM_SIZE_MAX, { error: `Keep the team to ${TEAM_SIZE_MAX} people or fewer.` }),
  ),
  about: z
    .string({ error: "Say what the hackathon is about." })
    .trim()
    .min(10, { error: "Say a little more about the hackathon (at least 10 characters)." })
    .max(ABOUT_MAX, { error: `Keep it under ${ABOUT_MAX} characters.` }),
  lookingFor: z
    .string({ error: "Say who you're looking for." })
    .trim()
    .min(3, { error: "Say who you're looking for." })
    .max(LOOKING_FOR_MAX, { error: `Keep it under ${LOOKING_FOR_MAX} characters.` }),
});

export const joinNoteSchema = z
  .string()
  .trim()
  .max(JOIN_NOTE_MAX, { error: `Keep the note under ${JOIN_NOTE_MAX} characters.` })
  .optional()
  .default("");
