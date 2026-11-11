import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CardSkeleton } from "@/components/skeleton";
import { ButtonLink, Card } from "@/components/ui";
import { requireOnboardedProfile } from "@/lib/auth/dal";
import { listMyTeams } from "@/lib/teams/data";
import { MAX_ACTIVE_TEAMS } from "@/lib/validation/teams";
import { CreateTeamForm } from "./create-team-form";

export const metadata: Metadata = { title: "Create a team" };

export default function NewTeamPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-4 px-4 py-8">
      <Link href="/teams" className="inline-block text-sm font-medium text-foreground hover:text-accent-ink">
        ← Teams
      </Link>
      <Suspense fallback={<CardSkeleton lines={8} />}>
        <NewTeam />
      </Suspense>
    </main>
  );
}

async function NewTeam() {
  await requireOnboardedProfile();
  const led = (await listMyTeams()).filter((t) => t.isOwner && !t.completed).length;

  if (led >= MAX_ACTIVE_TEAMS) {
    return (
      <Card className="space-y-3 text-center sm:p-8">
        <h1 className="text-xl font-semibold">You already lead {MAX_ACTIVE_TEAMS} active teams</h1>
        <p className="text-sm text-muted">
          Open a team you lead and mark it as completed once its hackathon is over. Then you can create another.
        </p>
        <ButtonLink href="/teams">Go to your teams</ButtonLink>
      </Card>
    );
  }

  return (
    <Card className="space-y-6 sm:p-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Create a team</h1>
        <p className="text-sm text-muted">
          You&apos;ll be the team lead. You can lead up to {MAX_ACTIVE_TEAMS} active teams ({led} now).
        </p>
      </div>
      <CreateTeamForm />
    </Card>
  );
}
