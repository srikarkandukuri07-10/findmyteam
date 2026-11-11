import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/site-url";
import { hasVerifiedEmail } from "@/lib/auth/email-verified";
import { hasEarlyAccess, isWaitlistMode } from "@/lib/waitlist/mode";

/**
 * Where Google sign-in lands (AUTH-1, D25). Supabase sends either a one-time `code` to exchange for a
 * session, or an `error`: for example when sign-ups are closed in Supabase and this Google account
 * has no FindMyTeam account yet. Before launch only early-access accounts stay signed in (D24).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNextPath(searchParams.get("next"), "/home");
  const toLogin = (error: string) => NextResponse.redirect(new URL(`/login?error=${error}`, origin));

  const providerError = searchParams.get("error");
  if (providerError) {
    const description = searchParams.get("error_description") ?? "";
    if (providerError === "access_denied" && !/signup/i.test(description)) return toLogin("cancelled");
    return toLogin(/signup/i.test(description) ? "not_invited" : "failed");
  }

  const code = searchParams.get("code");
  if (!code) return toLogin("failed");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return toLogin("failed");

  if (isWaitlistMode() && !hasEarlyAccess(data.user)) {
    await supabase.auth.signOut();
    return toLogin("not_invited");
  }

  // D27: a Google sign-up confirms its email with a one-time code before going further.
  if (!hasVerifiedEmail(data.user)) {
    return NextResponse.redirect(new URL(`/verify-email?next=${encodeURIComponent(next)}`, origin));
  }
  // The (app) layout sends students who haven't finished onboarding to /onboarding.
  return NextResponse.redirect(new URL(next, origin));
}
