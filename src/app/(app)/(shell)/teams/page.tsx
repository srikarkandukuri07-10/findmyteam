import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { GridSkeleton } from "@/components/skeleton";
import { BrowseTeamCard, MyTeamCard } from "@/components/teams/team-cards";
import { ButtonLink, Card, Chip } from "@/components/ui";
import { requireOnboardedProfile } from "@/lib/auth/dal";
import { inboxTime } from "@/lib/messages/format";
import { listMyJoinRequests, listMyTeams, listTeams } from "@/lib/teams/data";
import { MAX_ACTIVE_TEAMS } from "@/lib/validation/teams";

export const metadata: Metadata = { title: "Teams" };

/** D29: my teams (to monitor), requests I've sent, and teams looking for people. */
export default function TeamsPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-8 px-4 py-8">
      <Suspense fallback={<GridSkeleton count={4} />}>
        <TeamsContent />
      </Suspense>
    </main>
  );
}

const SENT_LABELS = { pending: "Waiting", accepted: "Accepted", declined: "Declined", withdrawn: "Withdrawn" } as const;

async function TeamsContent() {
  await requireOnboardedProfile();
  const [mine, sent, open] = await Promise.all([listMyTeams(), listMyJoinRequests(), listTeams()]);
  const activeLed = mine.filter((t) => t.isOwner && !t.completed).length;
  const canCreate = activeLed < MAX_ACTIVE_TEAMS;
  const active = mine.filter((t) => !t.completed);
  const done = mine.filter((t) => t.completed);
  const waiting = mine.reduce((n, t) => n + (t.isOwner ? t.pendingCount : 0), 0);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Teams</h1>
          <p className="mt-1 text-sm text-muted sm:text-base">
            Create a team for a hackathon, or ask to join one that needs you.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {canCreate ? (
            <ButtonLink href="/teams/new">+ Create a team</ButtonLink>
          ) : (
            <span className="rounded-full bg-chip px-5 py-2.5 text-sm font-semibold text-muted">Create a team</span>
          )}
          <span className="text-xs text-muted">
            {activeLed} of {MAX_ACTIVE_TEAMS} active teams you lead
            {!canCreate && " · mark one completed to create another"}
          </span>
        </div>
      </div>

      <section className="space-y-4" aria-labelledby="my-teams">
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="my-teams" className="text-lg font-semibold tracking-tight">
            Your teams
          </h2>
          {waiting > 0 && <Chip tone="accent">{waiting} waiting for your reply</Chip>}
        </div>
        {active.length === 0 ? (
          <Card className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">You&apos;re not in a team yet</p>
              <p className="text-sm text-muted">
                Create one for your next hackathon, or ask to join a team below.
              </p>
            </div>
            {canCreate && <ButtonLink href="/teams/new">Create a team</ButtonLink>}
          </Card>
        ) : (
          <ul className="stagger grid gap-4 md:grid-cols-2">
            {active.map((t) => (
              <li key={t.id} className="min-w-0">
                <MyTeamCard team={t} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {sent.length > 0 && (
        <section className="space-y-3" aria-labelledby="sent">
          <h2 id="sent" className="text-lg font-semibold tracking-tight">
            Requests you&apos;ve sent
          </h2>
          <Card className="p-2 sm:p-2">
            <ul className="divide-y divide-border/70">
              {sent.map((r) => (
                <li key={`${r.teamId}-${r.createdAt}`}>
                  <Link
                    href={`/teams/${r.teamId}`}
                    className="flex items-center justify-between gap-3 rounded-2xl px-3 py-3 hover:bg-surface-muted"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{r.hackathonName}</span>
                      <span className="block truncate text-xs text-muted">
                        {[r.ownerName && `Led by ${r.ownerName}`, inboxTime(r.createdAt)].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <Chip tone={r.status === "accepted" ? "success" : r.status === "pending" ? "accent" : "neutral"}>
                      {SENT_LABELS[r.status]}
                    </Chip>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}

      <section className="space-y-4" aria-labelledby="open-teams">
        <h2 id="open-teams" className="text-lg font-semibold tracking-tight">
          Teams looking for teammates
        </h2>
        {open.length === 0 ? (
          <Card className="space-y-1 text-center">
            <p className="font-semibold">No open teams right now</p>
            <p className="text-sm text-muted">Be the first: create a team and others can ask to join.</p>
          </Card>
        ) : (
          <ul className="stagger grid gap-4 md:grid-cols-2">
            {open.map((t) => (
              <li key={t.id} className="min-w-0">
                <BrowseTeamCard team={t} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {done.length > 0 && (
        <section className="space-y-4" aria-labelledby="done-teams">
          <h2 id="done-teams" className="text-lg font-semibold tracking-tight text-muted">
            Completed
          </h2>
          <ul className="grid gap-4 md:grid-cols-2">
            {done.map((t) => (
              <li key={t.id} className="min-w-0">
                <MyTeamCard team={t} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
