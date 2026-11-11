/**
 * How long a student stays signed in (D27): 30 days, renewed whenever they use the site, so someone
 * who opens FindMyTeam at least once a month never has to sign in again.
 *
 * @supabase/ssr always writes its own 400-day lifetime and ignores a `cookieOptions.maxAge`, so every
 * place that writes the session cookie passes its options through `withSessionLifetime` first.
 */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

/** Keeps removals (maxAge 0) as they are; gives every other session cookie the 30-day lifetime. */
export function withSessionLifetime<T extends { maxAge?: number }>(options: T): T {
  return options.maxAge === 0 ? options : { ...options, maxAge: SESSION_MAX_AGE_SECONDS };
}
