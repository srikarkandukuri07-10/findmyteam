import "server-only";
import { requireUser } from "@/lib/auth/dal";

/** The signed-in student's onboarding state: their own details only, including their own phone. */
export async function getMyOnboarding() {
  const { supabase, userId } = await requireUser();
  const [{ data, error }, claims] = await Promise.all([supabase.rpc("my_onboarding"), supabase.auth.getClaims()]);
  if (error) throw error;
  const row = data[0];
  if (!row) throw new Error("profile_missing");
  // Starting values from the Google account (D25, D26): name and email.
  const meta = claims.data?.claims.user_metadata as { full_name?: unknown; name?: unknown } | undefined;
  const googleName = typeof meta?.full_name === "string" ? meta.full_name : typeof meta?.name === "string" ? meta.name : "";
  return { ...row, userId, googleName: googleName.trim().slice(0, 60) };
}
