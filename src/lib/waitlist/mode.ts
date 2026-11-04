/**
 * Pre-launch lock (DECISIONS D19). While it is on, the public site is the waitlist landing page only:
 * every other route redirects to "/", and the sign-up / log-in actions refuse to run.
 *
 * It is ON unless WAITLIST_MODE is exactly "off", so a missing variable can never open sign-ups.
 * Set WAITLIST_MODE=off only in a local .env.local to work on the app itself.
 */
export function isWaitlistMode() {
  return process.env.WAITLIST_MODE !== "off";
}

/** The only pages anyone can open while the lock is on. */
export const WAITLIST_OPEN_PATHS = ["/", "/privacy", "/terms"];

export const WAITLIST_LOCKED_MESSAGE = "FindMyTeam hasn't launched yet. Join the waitlist on the home page.";
