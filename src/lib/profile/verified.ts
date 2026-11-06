import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/** D25: which of these students have the Verified student badge (a confirmed college email on an approved domain). */
export async function verifiedStudentIds(supabase: SupabaseClient<Database>, ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const { data, error } = await supabase.rpc("college_verified_ids", { p_ids: ids.slice(0, 200) });
  if (error || !data) return new Set();
  return new Set(data);
}
