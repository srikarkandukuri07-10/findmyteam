import "server-only";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/dal";
import type { Database } from "@/lib/supabase/database.types";

export type HackathonRow = Database["public"]["Functions"]["list_hackathons"]["Returns"][number];

/** Upcoming and ongoing hackathons by default; pass `includePast` to add finished ones. */
export async function listHackathons(options: { query?: string; includePast?: boolean; limit?: number } = {}) {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("list_hackathons", {
    p_query: options.query || undefined,
    p_include_past: options.includePast ?? false,
    p_limit: options.limit ?? 50,
  });
  if (error) throw error;
  return data;
}

export async function getHackathon(id: string): Promise<HackathonRow> {
  if (!z.uuid().safeParse(id).success) notFound();
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("get_hackathon", { p_id: id });
  if (error) throw error;
  const row = data[0];
  if (!row) notFound();
  return row;
}

export async function countMyUpcomingInterests() {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("my_hackathon_interest_count");
  if (error) throw error;
  return data;
}
