import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageTransition } from "@/components/page-transition";
import { GridSkeleton } from "@/components/skeleton";
import { TeamCard } from "@/components/team-card";
import { Card, PageHeader } from "@/components/ui";
import { requireOnboardedProfile } from "@/lib/auth/dal";
import { listTeams } from "@/lib/teams/data";
import { z } from "zod";

export const metadata: Metadata = { title: "Teams" };

export default function TeamsPage(props: PageProps<"/teams">) {
  return (
    <PageTransition>
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-8">
        <PageHeader title="Teams" subtitle="Teams already forming around hackathons. Open one to see who is in it." />
        <Suspense fallback={<GridSkeleton count={4} />}>
          <TeamList searchParams={props.searchParams} />
        </Suspense>
      </main>
    </PageTransition>
  );
}

async function TeamList({ searchParams }: { searchParams: PageProps<"/teams">["searchParams"] }) {
  await requireOnboardedProfile();
  const sp = await searchParams;
  const parsed = z.uuid().safeParse(sp.hackathon);
  const hackathonId = parsed.success ? parsed.data : undefined;

  // One query for every team; the hackathon filter is applied here so the filter chips stay stable.
  const allTeams = await listTeams();
  const filterable = [...new Map(allTeams.map((t) => [t.hackathonId, t.hackathonName])).entries()];
  const teams = hackathonId ? allTeams.filter((t) => t.hackathonId === hackathonId) : allTeams;

  return (
    <>
      <nav aria-label="Filter by hackathon" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <FilterLink href="/teams" active={!hackathonId} label="All teams" />
        {filterable.map(([id, name]) => (
          <FilterLink key={id} href={`/teams?hackathon=${id}`} active={id === hackathonId} label={name} />
        ))}
      </nav>

      {teams.length === 0 ? (
        <Card className="space-y-2 text-center">
          <h2 className="text-lg font-semibold">No teams here yet</h2>
          <p className="text-sm text-muted">Teams will show up as students start forming them.</p>
        </Card>
      ) : (
        <ul className="stagger grid gap-4 md:grid-cols-2">
          {teams.map((t) => (
            <li key={t.id} className="flex">
              <div className="w-full">
                <TeamCard team={t} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function FilterLink({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${
        active ? "bg-accent text-accent-foreground" : "bg-surface text-muted hover:text-foreground"
      }`}
    >
      {label}
    </Link>
  );
}
