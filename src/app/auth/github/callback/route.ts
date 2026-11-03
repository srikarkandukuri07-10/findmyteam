import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { withParam } from "@/lib/github/notices";
import { safeNextPath } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";

/**
 * Where GitHub sends the student back after authorizing. The one-time GitHub token is handed
 * straight to the database, which fetches the student's public activity itself, so the numbers
 * can't be forged. The token is never stored or logged.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNextPath(searchParams.get("next"), "/profile");
  const back = (code: string) => NextResponse.redirect(new URL(withParam(next, "github", code), origin));

  if (searchParams.get("error")) return back("denied"); // the student pressed Cancel on GitHub

  const code = searchParams.get("code");
  if (!code) return back("failed");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  const token = data?.session?.provider_token;
  if (error || !token) return back("failed");

  const { error: rpcError } = await supabase.rpc("connect_github", { p_token: token });
  if (rpcError) {
    const message = rpcError.message;
    return back(message.includes("identity_mismatch") ? "mismatch" : message.includes("rate_limited") ? "wait" : "failed");
  }

  revalidatePath("/", "layout");
  return back("connected");
}
