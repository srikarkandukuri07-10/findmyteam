import "server-only";
import { cache } from "react";
import { requireOnboardedProfile, requireUser } from "@/lib/auth/dal";

export type ShellInfo = {
  name: string;
  firstName: string;
  id: string;
  avatarPath: string | null;
  role: "student" | "investor" | "admin";
  /** Requests waiting for this student's answer (the 14-day expiry included). */
  pendingRequests: number;
};

/** What the sidebar and top bar show. Cached per request, since both ask for it. */
export const getShellInfo = cache(async (): Promise<ShellInfo> => {
  const profile = await requireOnboardedProfile();
  const { supabase, userId } = await requireUser();
  const [{ data: me }, { count }] = await Promise.all([
    supabase.from("profiles").select("role, avatar_path").eq("id", userId).single(),
    supabase
      .from("connection_requests")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", userId)
      .eq("status", "pending")
      .gt("created_at", new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString()),
  ]);
  const name = profile.display_name ?? "Student";
  return {
    id: userId,
    avatarPath: me?.avatar_path ?? null,
    name,
    firstName: name.split(" ")[0] ?? name,
    role: me?.role ?? "student",
    pendingRequests: count ?? 0,
  };
});
