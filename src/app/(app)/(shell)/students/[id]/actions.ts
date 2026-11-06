"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/dal";
import type { SwipeResult } from "@/lib/discover/swipe-logic";

const id = z.uuid();

/** CONN-1 from a profile page: the same request as a right swipe (same daily cap, same rules). */
export async function connectFromProfile(targetId: string): Promise<{ result: SwipeResult }> {
  const parsed = id.safeParse(targetId);
  if (!parsed.success) return { result: "error" };
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("swipe_person", { p_target: parsed.data, p_action: "connect" });
  if (error) return { result: "error" };
  const result = (["sent", "skipped", "already", "limit"] as const).find((r) => r === data) ?? "error";
  revalidatePath(`/students/${parsed.data}`);
  revalidatePath("/requests");
  return { result };
}
