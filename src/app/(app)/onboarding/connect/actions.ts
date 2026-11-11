"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/dal";
import { fieldErrors } from "@/lib/validation/common";
import { pastHackathonSchema } from "@/lib/validation/onboarding";
import { linkedinSchema } from "@/lib/validation/profile";
import type { FormState } from "@/app/(auth)/actions";

/** D26 Card 3: save (or clear) the LinkedIn link. */
export async function saveLinkedin(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = formData.get("linkedinUrl");
  const values = { linkedinUrl: typeof raw === "string" ? raw : "" };

  const parsed = linkedinSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };

  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("set_linkedin_url", { p_url: (parsed.data.linkedinUrl ?? null) as string });
  if (error) return { values, message: { ok: false, text: "Couldn't save your LinkedIn link. Try again." } };

  revalidatePath("/onboarding/connect");
  return { values, message: { ok: true, text: parsed.data.linkedinUrl ? "LinkedIn saved." : "LinkedIn removed." } };
}

export type HackathonFormState = FormState & { savedAt?: number };

/** D26 Card 3 and profile: add a past hackathon (winners can add the idea, live link and demo). */
export async function addPastHackathon(_prev: HackathonFormState, formData: FormData): Promise<HackathonFormState> {
  const str = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v : "";
  };
  const values = { name: str("name"), year: str("year"), result: str("result"), idea: str("idea"), liveUrl: str("liveUrl"), demoUrl: str("demoUrl") };
  const parsed = pastHackathonSchema().safeParse(values);
  if (!parsed.success) return { values, errors: fieldErrors(parsed.error) };

  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("add_past_hackathon", {
    p_name: parsed.data.name,
    p_year: parsed.data.year,
    p_result: parsed.data.result,
    p_idea: parsed.data.idea ?? null,
    p_live_url: parsed.data.liveUrl ?? null,
    p_demo_url: parsed.data.demoUrl ?? null,
  });
  if (error) {
    return {
      values,
      message: { ok: false, text: error.message === "too_many" ? "You can list up to 12 hackathons." : "Couldn't add it. Check the details." },
    };
  }
  revalidatePath("/", "layout");
  return { savedAt: Date.now() };
}

export async function deletePastHackathon(id: string): Promise<{ ok: boolean }> {
  const parsed = z.uuid().safeParse(id);
  if (!parsed.success) return { ok: false };
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("delete_past_hackathon", { p_id: parsed.data });
  revalidatePath("/", "layout");
  return { ok: !error };
}
