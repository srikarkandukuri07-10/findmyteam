import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/site-url";

/** D27: refresh the session so a newly set app_metadata mark is in the token, then continue. */
export async function GET(request: NextRequest) {
  const next = safeNextPath(request.nextUrl.searchParams.get("next"), "/home");
  const supabase = await createClient();
  await supabase.auth.refreshSession();
  return NextResponse.redirect(new URL(next, request.nextUrl.origin));
}
