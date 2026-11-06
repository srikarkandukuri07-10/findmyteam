"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/dal";

export type GrantState = { kind: "idle" } | { kind: "ok"; text: string } | { kind: "error"; text: string };

const grantSchema = z.object({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email("Enter a valid email.")),
});

/** D24, D25: an admin gives a teammate early access by the Gmail address they sign in to Google with. */
export async function grantEarlyAccess(_prev: GrantState, formData: FormData): Promise<GrantState> {
  const parsed = grantSchema.safeParse({ email: formData.get("email") ?? "" });
  if (!parsed.success) return { kind: "error", text: parsed.error.issues[0]?.message ?? "Check the details." };

  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("admin_grant_early_access", { p_email: parsed.data.email });
  if (error) {
    const text: Record<string, string> = {
      not_admin: "Only admins can do this.",
      invalid_email: "Enter a valid email.",
    };
    return { kind: "error", text: text[error.message] ?? "Couldn't give access. Try again." };
  }
  revalidatePath("/admin/access");
  return {
    kind: "ok",
    text:
      data === "created"
        ? "Early access given. They can now press Continue with Google at findmyteam.tech/login with this address."
        : "Early access given to their existing account. They can sign in with Google now.",
  };
}

export async function revokeEarlyAccess(userId: string): Promise<{ ok: boolean }> {
  const id = z.uuid().safeParse(userId);
  if (!id.success) return { ok: false };
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("admin_revoke_early_access", { p_user: id.data });
  revalidatePath("/admin/access");
  return { ok: !error };
}

/** D25: approve (badge on) or un-approve (badge off) a college email domain. */
export async function setCollegeDomain(domain: string, approved: boolean): Promise<{ ok: boolean }> {
  const parsed = z
    .object({ domain: z.string().trim().toLowerCase().min(3).max(253), approved: z.boolean() })
    .safeParse({ domain, approved });
  if (!parsed.success) return { ok: false };
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("admin_set_college_domain", {
    p_domain: parsed.data.domain,
    p_approved: parsed.data.approved,
  });
  revalidatePath("/admin/access");
  return { ok: !error };
}
