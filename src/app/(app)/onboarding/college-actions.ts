"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth/dal";

export type CollegeOption = { id: number; name: string; place: string | null; kind: string; pending: boolean };

/** D26: suggestions while typing, across all colleges and universities in India. */
export async function searchColleges(query: string): Promise<CollegeOption[]> {
  const q = z.string().trim().min(2).max(80).safeParse(query);
  if (!q.success) return [];
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("search_colleges", { p_query: q.data });
  if (error) return [];
  return data;
}

const addSchema = z.object({
  name: z.string().trim().min(5, { error: "Enter the full college name." }).max(160),
  state: z.string().trim().min(2, { error: "Pick the state." }).max(60),
  district: z.string().trim().max(60).optional().default(""),
});

/** "Can't find your college?" The student can use it at once; an admin reviews it. */
export async function addCollege(input: {
  name: string;
  state: string;
  district: string;
}): Promise<{ ok: true; college: CollegeOption } | { ok: false; error: string }> {
  const parsed = addSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the details." };
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("add_college", {
    p_name: parsed.data.name,
    p_state: parsed.data.state,
    p_district: parsed.data.district,
  });
  if (error) {
    return {
      ok: false,
      error: error.message === "rate_limited" ? "You've added 3 colleges today. Try again tomorrow." : "Couldn't add it. Check the name and try again.",
    };
  }
  const place = [parsed.data.district, parsed.data.state].filter(Boolean).join(", ");
  return { ok: true, college: { id: data, name: parsed.data.name, place, kind: "college", pending: true } };
}
