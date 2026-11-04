import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import { WAITLIST_OPEN_PATHS, isWaitlistMode } from "@/lib/waitlist/mode";

export async function proxy(request: NextRequest) {
  // Before launch the site is the waitlist only: no sign-up, log-in, auth callbacks or app pages.
  if (isWaitlistMode()) {
    if (WAITLIST_OPEN_PATHS.includes(request.nextUrl.pathname)) return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return updateSession(request);
}

export const config = {
  matcher: [
    // Skip static assets, image optimisation and the health check.
    "/((?!_next/static|_next/image|favicon.ico|api/health|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
