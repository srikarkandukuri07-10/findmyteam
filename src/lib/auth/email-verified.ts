/**
 * D27: true once the account has entered a one-time email code (set by confirm_email_code in the
 * database, in app_metadata, which only the server can write). Read from the sign-in token, no query.
 */
export function hasVerifiedEmail(claims: unknown): boolean {
  if (!claims || typeof claims !== "object") return false;
  const meta = (claims as { app_metadata?: unknown }).app_metadata;
  return Boolean(meta && typeof meta === "object" && (meta as { email_code_verified?: unknown }).email_code_verified === true);
}

/** Pages a signed-in student can open before verifying their email. */
export const VERIFY_EMAIL_OPEN_PATHS = ["/verify-email", "/login", "/", "/privacy", "/terms"];
