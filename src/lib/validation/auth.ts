import { z } from "zod";
import { fieldErrors } from "./common";

export { fieldErrors };

/** Bump when the terms or privacy notice change; stored with each user's consent. */
export const CONSENT_VERSION = "2026-11-11";

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Enter a valid email address." }));

/** Local test accounts only (D25): everyone else signs in with Google. */
export const logInSchema = z.object({
  email,
  password: z.string().min(1, { error: "Enter your password." }),
});
