import type { Metadata } from "next";
import Form from "next/form";
import { Suspense } from "react";
import { GridSkeleton } from "@/components/skeleton";
import { PageTransition } from "@/components/page-transition";
import { HackathonCard } from "@/components/hackathon";
import { ButtonLink, Card, PageHeader, buttonStyles } from "@/components/ui";
import { requireOnboardedProfile } from "@/lib/auth/dal";
import { listHackathons } from "@/lib/hackathons/data";
import { todayInIndia } from "@/lib/hackathons/dates";
import { cleanSearchQuery } from "@/lib/validation/hackathons";

export const metadata: Metadata = { title: "Hackathons" };

export default function HackathonsPage(props: PageProps<"/hackathons">) {
  return (
    <PageTransition>
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-8">
      <PageHeader
        title="Hackathons"
        subtitle="Pick the events you care about. Teammates and teams are matched around them."
        action={<ButtonLink href="/hackathons/new">Add a hackathon</ButtonLink>}
      />
      <Suspense fallback={<GridSkeleton count={4} />}>
        <HackathonList searchParams={props.searchParams} />
      </Suspense>
    </main>
    </PageTransition>
  );
}

async function HackathonList({ searchParams }: { searchParams: PageProps<"/hackathons">["searchParams"] }) {
  await requireOnboardedProfile();
  const sp = await searchParams;
  const query = cleanSearchQuery(sp.q);
  const includePast = sp.past === "1";

  const hackathons = await listHackathons({ query, includePast });
  const today = todayInIndia();

  return (
    <>
      <Form action="/hackathons" className="flex flex-wrap items-center gap-3">
        <label htmlFor="q" className="sr-only">
          Search hackathons
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={query}
          maxLength={80}
          placeholder="Search by name or organizer"
          className="w-full min-w-0 rounded-full border border-border bg-surface px-5 py-2.5 text-sm placeholder:text-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 sm:w-80"
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="past" value="1" defaultChecked={includePast} className="size-4 accent-accent" />
          Include past events
        </label>
        <button type="submit" className={buttonStyles.secondary}>
          Search
        </button>
      </Form>

      {hackathons.length === 0 ? (
        <Card className="space-y-3 text-center">
          <h2 className="text-lg font-semibold">
            {query ? `No hackathons match "${query}"` : "No upcoming hackathons yet"}
          </h2>
          <p className="text-sm text-muted">
            {query
              ? "Check the spelling, or add it yourself so others can find it."
              : "Know of one coming up? Add it and mark your interest."}
          </p>
          <div className="flex justify-center">
            <ButtonLink href="/hackathons/new">Add a hackathon</ButtonLink>
          </div>
        </Card>
      ) : (
        <ul className="stagger grid gap-4 md:grid-cols-2">
          {hackathons.map((h) => (
            <li key={h.id} className="flex">
              <div className="flex w-full flex-col">
                <HackathonCard hackathon={h} today={today} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
