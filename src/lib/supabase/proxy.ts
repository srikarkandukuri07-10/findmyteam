import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "@/lib/env";
import { EARLY_ACCESS_SIGN_IN_PATHS, WAITLIST_OPEN_PATHS, hasEarlyAccess, isWaitlistMode } from "@/lib/waitlist/mode";
import { VERIFY_EMAIL_OPEN_PATHS, hasVerifiedEmail } from "@/lib/auth/email-verified";
import type { Database } from "./database.types";

/** Paths anyone can open. Everything else needs a signed-in (and therefore email-verified) user. */
const PUBLIC_PATHS = ["/", "/login", "/terms", "/privacy"];
const PUBLIC_PREFIXES = ["/auth/"];
/** Signed-in users are sent past these to the app. */
const SIGNED_OUT_ONLY = ["/login"];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.includes(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

/**
 * Refreshes the Supabase session cookie once per navigation, then applies
 * route protection. Onboarding completion is checked in the (app) layout, not here,
 * so this never queries the database.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const env = publicEnv();

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
          for (const [key, value] of Object.entries(headers ?? {})) {
            response.headers.set(key, value);
          }
        },
      },
    },
  );

  // Do not put code between client creation and this call: it triggers the token refresh.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);
  const { pathname, search } = request.nextUrl;

  // Pre-launch lock (D19, D24, D25): only the waitlist pages and Google sign-in are public, and only
  // early-access accounts get past them. /auth/confirm signs anyone else straight back out.
  if (isWaitlistMode()) {
    const early = signedIn && hasEarlyAccess(data?.claims);
    const allowed =
      WAITLIST_OPEN_PATHS.includes(pathname) ||
      EARLY_ACCESS_SIGN_IN_PATHS.includes(pathname) ||
      early;
    if (!allowed) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.search = "";
      return redirectKeepingCookies(url, response);
    }
  }

  if (!signedIn && !isPublic(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return redirectKeepingCookies(url, response);
  }

  // D27: an account that hasn't entered an email code yet (e.g. straight after Google) verifies first.
  if (signedIn && !hasVerifiedEmail(data?.claims) && !VERIFY_EMAIL_OPEN_PATHS.includes(pathname) && !pathname.startsWith("/auth/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/verify-email";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return redirectKeepingCookies(url, response);
  }

  if (signedIn && SIGNED_OUT_ONLY.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/home";
    url.search = "";
    return redirectKeepingCookies(url, response);
  }

  return response;
}

/** A redirect must carry any refreshed session cookies, or the user is signed out. */
function redirectKeepingCookies(url: URL, from: NextResponse) {
  const redirect = NextResponse.redirect(url);
  for (const cookie of from.cookies.getAll()) {
    redirect.cookies.set(cookie);
  }
  return redirect;
}
