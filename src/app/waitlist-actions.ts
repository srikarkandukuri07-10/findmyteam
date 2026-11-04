"use server";

import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { createAnonClient } from "@/lib/supabase/anon";
import { getWaitlistStats, type WaitlistStats } from "@/lib/waitlist/data";
import {
  WAITLIST_CONSENT_VERSION,
  joinResultSchema,
  standingSchema,
  waitlistSchema,
  type Standing,
} from "@/lib/validation/waitlist";

/** What the student typed, sent back after a failed submit so the form keeps it. */
export type JoinValues = {
  name: string;
  email: string;
  college: string;
  collegeOther: string;
  branch: string;
  year: string;
  roles: string[];
  painPoint: string;
  btech: boolean;
  consent: boolean;
};

export type JoinState =
  | { kind: "idle" }
  | {
      kind: "error";
      errors?: Record<string, string>;
      message?: string;
      values: JoinValues;
      attempt: number;
    }
  | { kind: "joined"; standing: Standing; stats: WaitlistStats };

function text(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" ? v.slice(0, 400) : "";
}

function echo(formData: FormData): JoinValues {
  return {
    name: text(formData, "name"),
    email: text(formData, "email"),
    college: text(formData, "college"),
    collegeOther: text(formData, "collegeOther"),
    branch: text(formData, "branch"),
    year: text(formData, "year"),
    roles: formData
      .getAll("roles")
      .filter((r): r is string => typeof r === "string")
      .slice(0, 20),
    painPoint: text(formData, "painPoint"),
    btech: formData.get("btech") === "on",
    consent: formData.get("consent") === "on",
  };
}

/**
 * The network a sign-up came from, as a keyed hash: enough to limit one network to 5 sign-ups an hour,
 * never the address itself. Without WAITLIST_HASH_SECRET there is no limit (local development).
 */
async function networkHash() {
  const secret = process.env.WAITLIST_HASH_SECRET;
  if (!secret) return null;
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "";
  if (!ip) return null;
  return createHmac("sha256", secret).update(ip).digest("hex");
}

/** WAIT-1: join the waitlist from the landing page. */
export async function joinWaitlist(prev: JoinState, formData: FormData): Promise<JoinState> {
  const attempt = (prev.kind === "error" ? prev.attempt : 0) + 1;
  const fail = (e: { errors?: Record<string, string>; message?: string }): JoinState => ({
    kind: "error",
    ...e,
    values: echo(formData),
    attempt,
  });

  // Bots fill every field; people never see this one.
  if (formData.get("website")) return fail({ message: "Something went wrong. Please try again." });

  const parsed = waitlistSchema.safeParse({
    name: formData.get("name") ?? "",
    email: formData.get("email") ?? "",
    college: formData.get("college") ?? "",
    collegeOther: formData.get("collegeOther") ?? "",
    branch: formData.get("branch") ?? "",
    year: formData.get("year") ?? "",
    roles: formData.getAll("roles"),
    painPoint: formData.get("painPoint") ?? "",
    btech: formData.get("btech") ?? undefined,
    consent: formData.get("consent") ?? undefined,
    ref: formData.get("ref") || undefined,
    source: formData.get("source") || undefined,
  });
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      errors[key] ??= issue.message;
    }
    return fail({ errors });
  }

  const v = parsed.data;
  const { data, error } = await createAnonClient().rpc("join_waitlist", {
    p_email: v.email,
    p_name: v.name,
    p_college_id: v.college === "other" ? null : Number(v.college),
    p_college_other: v.college === "other" ? v.collegeOther : null,
    p_branch_id: v.branch ?? null,
    p_year: v.year,
    p_role_ids: v.roles,
    p_pain_point: v.painPoint || null,
    p_ref: v.ref ?? null,
    p_source: v.source ?? null,
    p_ip_hash: await networkHash(),
    p_consent_version: WAITLIST_CONSENT_VERSION,
  });
  if (error)
    return fail({
      message: "We couldn't save that. Please try again in a moment.",
    });

  const result = joinResultSchema.safeParse(data);
  if (!result.success)
    return fail({
      message: "We couldn't save that. Please try again in a moment.",
    });

  switch (result.data.status) {
    case "joined": {
      const { code, position, referrals } = result.data;
      return {
        kind: "joined",
        standing: { code, position, referrals },
        stats: await getWaitlistStats(),
      };
    }
    case "already":
      return fail({
        errors: { email: "This email is already on the waitlist. You're in!" },
      });
    case "limit":
      return fail({
        message: "Too many sign-ups from your network right now. Try again in an hour.",
      });
    default:
      return fail({
        message: "Some details look off. Check the form and try again.",
      });
  }
}

/** The success screen for someone coming back with their own code (kept in their browser). */
export async function getStanding(code: string): Promise<{ standing: Standing; stats: WaitlistStats } | null> {
  if (!/^[a-z0-9]{8}$/.test(code)) return null;
  const { data, error } = await createAnonClient().rpc("waitlist_standing", {
    p_code: code,
  });
  if (error || !data) return null;
  const standing = standingSchema.safeParse(data);
  if (!standing.success) return null;
  return { standing: standing.data, stats: await getWaitlistStats() };
}
