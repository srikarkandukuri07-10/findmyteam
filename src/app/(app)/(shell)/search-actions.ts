"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth/dal";

const personSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  avatar_path: z.string().nullable(),
  is_demo: z.boolean(),
  college: z.string().nullable(),
  branch: z.string().nullable(),
  year: z.number().nullable(),
  matched_skill: z.string().nullable(),
  roles: z.array(z.string()),
});
const teamSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  is_demo: z.boolean(),
  hackathon: z.string().nullable(),
  members: z.number(),
});
const resultSchema = z.object({
  people: z.array(personSchema),
  teams: z.array(teamSchema),
  limited: z.boolean().optional(),
});

export type SearchPerson = z.infer<typeof personSchema>;
export type SearchTeam = z.infer<typeof teamSchema>;
export type SearchResult = z.infer<typeof resultSchema>;

const EMPTY: SearchResult = { people: [], teams: [] };

/** SRCH-1: suggestions as the student types. Never returns emails. */
export async function searchEverything(query: string): Promise<SearchResult> {
  const q = z.string().trim().min(1).max(60).safeParse(query);
  if (!q.success) return EMPTY;
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("search_everything", { p_query: q.data });
  if (error) return EMPTY;
  return resultSchema.catch(EMPTY).parse(data);
}
