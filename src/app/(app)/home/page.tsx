import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Card, CardTitle, Chip, Stat } from "@/components/ui";
import { requireOnboardedProfile } from "@/lib/auth/dal";
import { countMyUpcomingInterests, listHackathons } from "@/lib/hackathons/data";
import { MODE_LABELS, formatShortDate, phaseLabel, todayInIndia } from "@/lib/hackathons/dates";
import { PROFILE_BUILT_THRESHOLD } from "@/lib/profile/completeness";
import { getMyCompleteness } from "@/lib/profile/data";

export const metadata: Metadata = { title: "Home" };

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
      <Suspense fallback={<p className="text-sm">Loading your dashboard…</p>}>
        <Dashboard />
      </Suspense>
    </main>
  );
}

async function Dashboard() {
  const profile = await requireOnboardedProfile();
  const [upcoming, myInterests, completeness] = await Promise.all([
    listHackathons({ limit: 5 }),
    countMyUpcomingInterests(),
    getMyCompleteness(),
  ]);
  const today = todayInIndia();

  const college = profile.colleges?.name ?? profile.college_other;
  const firstName = profile.display_name?.split(" ")[0];
  const degree = profile.degree === "be" ? "B.E." : "B.Tech";

  const steps = [
    { label: "Create your account", done: true },
    { label: "Follow a hackathon you care about", done: myInterests > 0, href: "/hackathons" },
    { label: "Connect GitHub (optional)", done: completeness.githubConnected, href: "/profile/edit" },
    { label: "Build your profile", done: completeness.percent >= PROFILE_BUILT_THRESHOLD, href: "/profile/edit" },
    { label: "Find teammates and teams", soon: true },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="flex flex-col justify-between gap-6 md:col-span-1">
        <div className="space-y-1">
          <p className="text-sm text-muted">Welcome back</p>
          <h1 className="text-3xl font-semibold tracking-tight">{firstName}</h1>
        </div>
        <div className="space-y-2 text-sm">
          <p>{profile.branches?.name}</p>
          <p className="text-muted">{college}</p>
          <Chip tone="accent">{degree}</Chip>
        </div>
      </Card>

      <Stat label="Hackathons you follow" value={myInterests} />
      <Stat label="Upcoming hackathons" value={upcoming.length >= 5 ? "5+" : upcoming.length} />

      <Card className="md:col-span-2">
        <CardTitle
          action={
            <Link href="/hackathons" className="text-sm font-medium text-accent hover:underline">
              View all
            </Link>
          }
        >
          Coming up
        </CardTitle>
        {upcoming.length === 0 ? (
          <div className="mt-4 space-y-3 text-sm">
            <p className="text-muted">No upcoming hackathons are listed yet.</p>
            <Link href="/hackathons/new" className="inline-block font-medium text-accent hover:underline">
              Add the first one →
            </Link>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {upcoming.map((h) => (
              <li key={h.id}>
                <Link
                  href={`/hackathons/${h.id}`}
                  className="flex items-center gap-4 py-3 transition-colors hover:text-accent"
                >
                  <span className="w-14 shrink-0 text-sm font-medium tabular-nums text-muted">
                    {formatShortDate(h.starts_on)}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium">{h.name}</span>
                  <span className="hidden sm:inline-flex">
                    <Chip tone="sand">{MODE_LABELS[h.mode]}</Chip>
                  </span>
                  <Chip tone={h.is_interested ? "accent" : "neutral"}>
                    {h.is_interested ? "Following" : phaseLabel(h.starts_on, h.ends_on, today)}
                  </Chip>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardTitle>Get started</CardTitle>
        <ul className="mt-4 space-y-3">
          {steps.map((s) => (
            <li key={s.label} className="flex items-center gap-3 text-sm">
              <span
                aria-hidden
                className={`grid size-5 shrink-0 place-items-center rounded-md border text-xs ${
                  s.done ? "border-accent bg-accent text-accent-foreground" : "border-accent-strong"
                }`}
              >
                {s.done ? "✓" : ""}
              </span>
              <span className={s.done ? "text-muted line-through" : ""}>
                {s.href && !s.done ? (
                  <Link href={s.href} className="font-medium hover:text-accent">
                    {s.label}
                  </Link>
                ) : (
                  s.label
                )}
              </span>
              {s.soon && <Chip>Soon</Chip>}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
