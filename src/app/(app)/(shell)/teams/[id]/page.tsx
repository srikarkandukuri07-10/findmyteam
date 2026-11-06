import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BACK_TRANSITION, PageTransition } from "@/components/page-transition";
import { CardSkeleton } from "@/components/skeleton";
import { Card, Chip } from "@/components/ui";
import { requireOnboardedProfile } from "@/lib/auth/dal";
import { formatDateRange } from "@/lib/hackathons/dates";
import { RECRUIT_LABELS, getTeam } from "@/lib/teams/data";
import { StudentAvatar } from "@/components/student-avatar";

export const metadata: Metadata = { title: "Team" };

export default function TeamPage(props: PageProps<"/teams/[id]">) {
  return (
    <PageTransition>
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-4 px-4 py-8">
        <Link
          href="/teams"
          transitionTypes={BACK_TRANSITION}
          className="inline-block text-sm font-medium text-foreground hover:text-accent-ink"
        >
          ← All teams
        </Link>
        <Suspense fallback={<CardSkeleton lines={6} />}>
          <TeamDetails params={props.params} />
        </Suspense>
      </main>
    </PageTransition>
  );
}

async function TeamDetails({ params }: { params: PageProps<"/teams/[id]">["params"] }) {
  await requireOnboardedProfile();
  const { id } = await params;
  const team = await getTeam(id);
  if (!team) notFound();

  return (
    <>
      <Card className="space-y-5 sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone={team.status === "open" || team.status === "partially_filled" ? "accent" : "neutral"}>
            {RECRUIT_LABELS[team.status]}
          </Chip>
          {team.isDemo && <Chip>Sample</Chip>}
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{team.name}</h1>
          <Link href={`/hackathons/${team.hackathonId}`} className="text-muted hover:text-accent-ink hover:underline">
            {team.hackathonName} · {formatDateRange(team.hackathonStartsOn, team.hackathonEndsOn)}
          </Link>
        </div>
        {team.description && <p className="leading-relaxed">{team.description}</p>}
        {team.idea && (
          <div className="rounded-2xl bg-surface-muted p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">The idea</p>
            <p className="mt-1">{team.idea}</p>
          </div>
        )}
        {team.positions.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Looking for</p>
            <ul className="flex flex-wrap gap-2">
              {team.positions.map((p) => (
                <li key={p.role}>
                  <Chip tone="sand">
                    {p.role}
                    {p.spots > 1 ? ` ×${p.spots}` : ""}
                  </Chip>
                </li>
              ))}
            </ul>
          </div>
        )}
        <button
          type="button"
          disabled
          className="w-full cursor-not-allowed rounded-full bg-chip px-5 py-2.5 text-sm font-semibold text-muted sm:w-auto"
        >
          Request to join — opens soon
        </button>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-lg font-medium tracking-tight">Members ({team.members.length})</h2>
        <ul className="stagger space-y-3">
          {team.members.map((m) => (
            <li key={m.id} className="reveal">
              <Link
                href={`/students/${m.id}`}
                className="lift flex items-center gap-3 rounded-2xl bg-surface-muted p-3"
              >
                <StudentAvatar id={m.id} name={m.name} avatarPath={m.avatar_path} size="sm" className="size-11" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 font-medium">
                    <span className="truncate">{m.name}</span>
                    {m.is_owner && <Chip tone="accent">Lead</Chip>}
                  </span>
                  <span className="block truncate text-sm text-muted">
                    {[m.roles.join(", "), m.college, `Year ${m.year}`].filter(Boolean).join(" · ")}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
