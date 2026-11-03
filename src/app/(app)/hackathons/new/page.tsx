import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BACK_TRANSITION, PageTransition } from "@/components/page-transition";
import { Card, PageHeader } from "@/components/ui";
import { requireOnboardedProfile } from "@/lib/auth/dal";
import { NewHackathonForm } from "./new-hackathon-form";

export const metadata: Metadata = { title: "Add a hackathon" };

export default function NewHackathonPage() {
  return (
    <PageTransition>
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-4 px-4 py-8">
      <Link href="/hackathons" transitionTypes={BACK_TRANSITION} className="inline-block text-sm font-medium hover:text-accent-ink">
        ← All hackathons
      </Link>
      <PageHeader title="Add a hackathon" subtitle="Check the list first, then add it so others can find it." />
      <Card className="sm:p-8">
        <Suspense fallback={<p className="text-sm">Loading…</p>}>
          <FormGate />
        </Suspense>
      </Card>
    </main>
    </PageTransition>
  );
}

/** Sends users who haven't finished onboarding to /onboarding before they see the form. */
async function FormGate() {
  await requireOnboardedProfile();
  return <NewHackathonForm />;
}
