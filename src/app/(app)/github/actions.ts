"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/dal";
import { withParam } from "@/lib/github/notices";
import { safeNextPath, siteUrl } from "@/lib/site-url";

function nextPath(formData: FormData) {
  const raw = formData.get("next");
  return safeNextPath(typeof raw === "string" ? raw : null, "/profile");
}

/** Starts the GitHub authorization. Sign-in stays email and password; this only links GitHub to the account. */
export async function connectGithub(formData: FormData) {
  const next = nextPath(formData);
  const { supabase } = await requireUser();

  const { data, error } = await supabase.auth.linkIdentity({
    provider: "github",
    options: { redirectTo: `${await siteUrl()}/auth/github/callback?next=${encodeURIComponent(next)}` },
  });

  // Most likely the GitHub provider or "manual linking" is not switched on in Supabase yet.
  if (error || !data?.url) redirect(withParam(next, "github", "unavailable"));
  redirect(data.url);
}

/** Removes the GitHub link, its stored data, and the identity itself. */
export async function disconnectGithub(formData: FormData) {
  const next = nextPath(formData);
  const { supabase } = await requireUser();

  const { data } = await supabase.auth.getUserIdentities();
  const github = data?.identities.find((i) => i.provider === "github");
  if (github) {
    const { error } = await supabase.auth.unlinkIdentity(github);
    if (error) redirect(withParam(next, "github", "failed"));
  }

  const { error } = await supabase.rpc("disconnect_github");
  if (error) redirect(withParam(next, "github", "failed"));

  revalidatePath("/", "layout");
  redirect(withParam(next, "github", "disconnected"));
}
