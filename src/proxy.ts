import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

/** Refreshes the session and applies route protection, including the pre-launch lock (D19, D24). */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Skip static assets, image optimisation, the health check and illustrated avatars.
    "/((?!_next/static|_next/image|favicon.ico|api/health|avatar/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
