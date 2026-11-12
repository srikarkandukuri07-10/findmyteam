import type { Metadata } from "next";
import { Suspense } from "react";
import { PageTransition } from "@/components/page-transition";
import { CardSkeleton } from "@/components/skeleton";
import { PageHeader } from "@/components/ui";
import { requireOnboardedProfile, requireUser } from "@/lib/auth/dal";
import { VerifyPanel } from "./verify-panel";

export const metadata: Metadata = { title: "Verify college email" };

export default function VerifyCollegePage() {
  return (
    <PageTransition>
      <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 pb-12 pt-6 sm:px-6">
        <PageHeader
          title="Verify college email"
          subtitle="Optional. Confirm your college email to get the Verified student badge on your profile and in Scout."
        />
        <Suspense fallback={<CardSkeleton lines={4} />}>
          <Verify />
        </Suspense>
      </main>
    </PageTransition>
  );
}

/** A code is still usable until it expires. Read at request time (requireUser marks the render dynamic). */
function stillValid(expiresAt: string | null) {
  return expiresAt !== null && Date.parse(expiresAt) > Date.now();
}

async function Verify() {
  await requireOnboardedProfile();
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("my_college_verification");
  if (error) throw error;
  const row = data[0];
  const pendingCode =
    row?.pending_email && (row.attempts_left ?? 0) > 0 && stillValid(row.code_expires_at) ? row.pending_email : null;
  return (
    <VerifyPanel
      confirmed={row?.email ?? null}
      badge={Boolean(row?.badge)}
      waitingForDomain={Boolean(row?.email && !row.badge)}
      pendingEmail={pendingCode}
    />
  );
}
