/**
 * Pre-launch lock (DECISIONS D19, D24). While it is on, the public site is the waitlist landing page:
 * sign-up is closed, and every app page redirects to "/" unless the visitor is signed in with an
 * early-access account (the founders and their testers).
 *
 * It is ON unless WAITLIST_MODE is exactly "off", so a missing variable can never open the app.
 * Set WAITLIST_MODE=off only in a local .env.local or on dev-branch previews.
 */
export function isWaitlistMode() {
  return process.env.WAITLIST_MODE !== "off";
}

/** The only pages anyone can open while the lock is on. */
export const WAITLIST_OPEN_PATHS = ["/", "/privacy", "/terms"];

/** Reachable while locked so early-access accounts can sign in with Google (D25). */
export const EARLY_ACCESS_SIGN_IN_PATHS = ["/login", "/verify-email", "/auth/confirm", "/auth/refresh", "/auth/error"];

export const EARLY_ACCESS_ONLY_MESSAGE =
  "FindMyTeam hasn't launched yet. Only the founding team can sign in for now. Join the waitlist on the home page.";

/**
 * True when the account is marked for early access. The mark lives in the account's app_metadata,
 * which only the server can change (students cannot edit it), and it travels inside the sign-in token.
 */
export function hasEarlyAccess(claims: unknown): boolean {
  if (!claims || typeof claims !== "object") return false;
  const meta = (claims as { app_metadata?: unknown }).app_metadata;
  return Boolean(meta && typeof meta === "object" && (meta as { early_access?: unknown }).early_access === true);
}
