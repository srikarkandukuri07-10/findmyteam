"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/dal";

export type GrantState = { kind: "idle" } | { kind: "ok"; text: string } | { kind: "error"; text: string };

const grantSchema = z.object({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email("Enter a valid email.")),
  password: z.string().max(72).optional().default(""),
});

/** D24: an admin gives a teammate early access, creating their account if needed. */
export async function grantEarlyAccess(_prev: GrantState, formData: FormData): Promise<GrantState> {
  const parsed = grantSchema.safeParse({ email: formData.get("email") ?? "", password: formData.get("password") ?? "" });
  if (!parsed.success) return { kind: "error", text: parsed.error.issues[0]?.message ?? "Check the details." };

  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("admin_grant_early_access", {
    p_email: parsed.data.email,
    p_password: parsed.data.password || null,
  });
  if (error) {
    const text: Record<string, string> = {
      not_admin: "Only admins can do this.",
      weak_password: "This email has no account yet: set a temporary password of at least 10 characters.",
      invalid_email: "Enter a valid email.",
    };
    return { kind: "error", text: text[error.message] ?? "Couldn't give access. Try again." };
  }
  revalidatePath("/admin/access");
  return data === "created"
    ? { kind: "ok", text: "Account created with early access. Share the email and temporary password privately." }
    : { kind: "ok", text: "Early access given. They can sign in at /login now." };
}

export async function revokeEarlyAccess(userId: string): Promise<{ ok: boolean }> {
  const id = z.uuid().safeParse(userId);
  if (!id.success) return { ok: false };
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("admin_revoke_early_access", { p_user: id.data });
  revalidatePath("/admin/access");
  return { ok: !error };
}
