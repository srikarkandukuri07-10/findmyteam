"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/dal";

const idSchema = z.uuid();

export async function respondToRequest(id: string, accept: boolean): Promise<{ ok: boolean }> {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { ok: false };
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("respond_request", { p_id: parsed.data, p_accept: accept });
  if (error) return { ok: false };
  revalidatePath("/requests");
  return { ok: true };
}

export async function cancelMyRequest(id: string): Promise<{ ok: boolean }> {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { ok: false };
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("cancel_request", { p_id: parsed.data });
  if (error) return { ok: false };
  revalidatePath("/requests");
  return { ok: true };
}
