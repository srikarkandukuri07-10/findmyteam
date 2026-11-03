"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/dal";
import { fieldErrors } from "@/lib/validation/common";
import { hackathonSchema } from "@/lib/validation/hackathons";
import type { FormState } from "@/app/(auth)/actions";

const FIELDS = ["name", "organizer", "mode", "city", "startsOn", "endsOn", "url"] as const;

/** HACK-2: any signed-in, onboarded user can add a hackathon (5 per day). */
export async function createHackathon(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw: Record<string, string> = {};
  for (const key of FIELDS) {
    const v = formData.get(key);
    if (typeof v === "string") raw[key] = v;
  }

  const parsed = hackathonSchema.safeParse(raw);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: raw };
  const input = parsed.data;

  const { supabase } = await requireUser();
  const { data: id, error } = await supabase.rpc("create_hackathon", {
    p_name: input.name,
    p_organizer: (input.organizer ?? null) as string,
    p_mode: input.mode,
    p_city: (input.city ?? null) as string,
    p_starts_on: input.startsOn,
    p_ends_on: input.endsOn,
    p_url: (input.url ?? null) as string,
  });

  if (error) {
    const text = error.message.includes("rate_limited")
      ? "You've added 5 hackathons today. Try again tomorrow."
      : error.message.includes("duplicate_hackathon")
        ? "A hackathon with this name and start date is already listed. Search for it instead."
        : "Couldn't save the hackathon. Check the details and try again.";
    return { values: raw, message: { ok: false, text } };
  }

  revalidatePath("/", "layout");
  redirect(`/hackathons/${id}`);
}

/** HACK-3: mark or remove interest in a hackathon. */
export async function setInterest(formData: FormData) {
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return;
  const interested = formData.get("interested") === "true";

  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("set_hackathon_interest", {
    p_hackathon_id: id.data,
    p_interested: interested,
  });
  // A hackathon removed in the meantime is not an error worth a crash page.
  if (error && !error.message.includes("hackathon_not_found")) throw error;

  revalidatePath("/", "layout");
}
