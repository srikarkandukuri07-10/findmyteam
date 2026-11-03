"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/dal";
import type { SwipeAction, SwipeResult } from "@/lib/discover/swipe-logic";

const inputSchema = z.object({ targetId: z.uuid(), action: z.enum(["connect", "skip"]) });

/**
 * DISC-3: swipe right = send a request, swipe left = skip (nothing is sent and nobody is told).
 * Called straight from the swipe deck rather than from a form.
 */
export async function swipePerson(targetId: string, action: SwipeAction): Promise<{ result: SwipeResult }> {
  const parsed = inputSchema.safeParse({ targetId, action });
  if (!parsed.success) return { result: "error" };

  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("swipe_person", {
    p_target: parsed.data.targetId,
    p_action: parsed.data.action,
  });
  if (error) return { result: "error" };

  const result = (["sent", "skipped", "already", "limit"] as const).find((r) => r === data) ?? "error";
  // Only the requests page changes; the deck itself must not refresh in the middle of a swipe.
  if (result === "sent") revalidatePath("/requests");
  return { result };
}
