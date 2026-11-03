import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Data access layer for the signed-in user. Every Server Component and Server Action
 * that needs the user goes through here, so authorization is checked close to the data.
 */
export async function requireUser() {
  // Supabase checks token expiry with Date.now(); mark the render as request-time first,
  // otherwise Cache Components rejects the clock read during prerendering.
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");
  return { supabase, userId: data.claims.sub };
}

export async function getMyProfile() {
  const { supabase, userId } = await requireUser();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, display_name, degree, onboarded_at, status, college_other, colleges(name), branches(name)")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return profile;
}

/** For pages inside the app: signed in and onboarded. Suspended/banned handling arrives in Module 9. */
export async function requireOnboardedProfile() {
  const profile = await getMyProfile();
  if (!profile.onboarded_at) redirect("/onboarding");
  return profile;
}
