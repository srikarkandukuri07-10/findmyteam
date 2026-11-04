import "server-only";
import { cacheLife } from "next/cache";
import { z } from "zod";
import { createAnonClient } from "@/lib/supabase/anon";

const option = z.object({ id: z.number(), name: z.string() });
const optionsSchema = z.object({ colleges: z.array(option), branches: z.array(option), roles: z.array(option) });
const statsSchema = z.object({
  total: z.number(),
  colleges: z.array(z.object({ name: z.string(), count: z.number() })),
});

export type WaitlistOptions = z.infer<typeof optionsSchema>;
export type WaitlistStats = z.infer<typeof statsSchema>;

const EMPTY_OPTIONS: WaitlistOptions = { colleges: [], branches: [], roles: [] };

/** Colleges, branches and roles for the form. Reference data, so cached for hours. */
export async function getWaitlistOptions(): Promise<WaitlistOptions> {
  "use cache";
  cacheLife("hours");
  const { data, error } = await createAnonClient().rpc("waitlist_options");
  if (error) return EMPTY_OPTIONS;
  return optionsSchema.catch(EMPTY_OPTIONS).parse(data);
}

/** Total and top colleges (aggregates only), refreshed every few minutes. */
export async function getWaitlistStats(): Promise<WaitlistStats> {
  "use cache";
  cacheLife("minutes");
  const { data, error } = await createAnonClient().rpc("waitlist_stats");
  if (error) return { total: 0, colleges: [] };
  return statsSchema.catch({ total: 0, colleges: [] }).parse(data);
}
