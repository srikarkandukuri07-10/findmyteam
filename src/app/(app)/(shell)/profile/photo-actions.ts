"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/dal";

const pathSchema = z
  .string()
  .regex(/^[0-9a-f-]{36}\/[a-z0-9-]{8,64}\.webp$/)
  .nullable();

/** PROF-1: point my profile at the photo I just uploaded, or clear it. Returns the previous path to delete. */
export async function setAvatar(path: string | null): Promise<{ ok: boolean; previous: string | null }> {
  const parsed = pathSchema.safeParse(path);
  if (!parsed.success) return { ok: false, previous: null };
  const { supabase, userId } = await requireUser();
  if (parsed.data && !parsed.data.startsWith(`${userId}/`)) return { ok: false, previous: null };

  const { data: before } = await supabase.from("profiles").select("avatar_path").eq("id", userId).single();
  const { error } = await supabase.rpc("set_avatar", { p_path: parsed.data });
  if (error) return { ok: false, previous: null };

  revalidatePath("/profile");
  revalidatePath("/home");
  return { ok: true, previous: before?.avatar_path ?? null };
}
