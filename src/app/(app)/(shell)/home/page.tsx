import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BannerArt } from "@/components/home/banner-art";
import { ArrowRightIcon, TeamsIcon } from "@/components/icons";
import { PageTransition } from "@/components/page-transition";
import { Skeleton } from "@/components/skeleton";
import { Chip } from "@/components/ui";
import { PROFILE_BUILT_THRESHOLD } from "@/lib/profile/completeness";
import { getMyCompleteness } from "@/lib/profile/data";
import { getShellInfo } from "@/lib/shell/data";
import { HackathonLink } from "@/components/teams/team-cards";
import { listTeams } from "@/lib/teams/data";

export const metadata: Metadata = { title: "Home" };

export default function HomePage() {
  return (
    <PageTransition>
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 pb-12 pt-6 sm:px-6">
        <Suspense fallback={<BannerSkeleton />}>
          <Banner />
        </Suspense>
        <Suspense fallback={<Skeleton className="h-80 rounded-[2rem]" />}>
          <TeamsLooking />
        </Suspense>
      </main>
    </PageTransition>
  );
}

function BannerSkeleton() {
  return (
    <div className="rounded-[2rem] bg-surface p-8 shadow-card">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="mt-5 h-12 w-3/4" />
      <Skeleton className="mt-3 h-12 w-2/3" />
      <Skeleton className="mt-6 h-12 w-64 rounded-full" />
    </div>
  );
}

async function Banner() {
  const [info, completeness] = await Promise.all([getShellInfo(), getMyCompleteness()]);
  const unfinished = completeness.percent < PROFILE_BUILT_THRESHOLD;

  return (
    <section className="reveal relative overflow-hidden rounded-[2rem] bg-surface shadow-card">
      <div aria-hidden className="drift absolute -right-20 -top-24 size-80 rounded-full bg-accent-soft blur-3xl" />
      <div className="relative grid items-center gap-6 p-6 sm:p-9 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] md:gap-2">
        <div className="space-y-5">
          <p className="text-2xl font-bold tracking-tight">
            Hey {info.firstName}!{" "}
            <span className="wave inline-block origin-[70%_70%]" aria-hidden>
              👋
            </span>
          </p>
          <h1 className="text-4xl font-bold leading-[1.05] tracking-tight lg:text-[2.6rem] 2xl:text-5xl">
            Find your team,
            <br />
            build something <em className="font-serif font-semibold italic text-accent-ink">legendary.</em>
          </h1>
          <p className="max-w-md text-lg text-muted">
            Connect with students from other colleges, find a team that needs your skills, and take your idea
            further.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/discover?go=1"
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-accent px-6 py-3.5 font-bold text-accent-foreground shadow-lift transition hover:-translate-y-0.5 hover:bg-accent-hover active:scale-95"
            >
              <span className="relative z-10">Start scouting</span>
              <ArrowRightIcon className="relative z-10 size-4 transition-transform group-hover:translate-x-1" />
              <span aria-hidden className="button-shine absolute inset-0" />
            </Link>
            <Link
              href="/teams"
              className="inline-flex items-center gap-2 rounded-full bg-chip/70 px-6 py-3.5 font-semibold transition hover:-translate-y-0.5 hover:bg-accent-soft"
            >
              Browse teams
            </Link>
          </div>
          {unfinished && (
            <Link
              href="/onboarding/profile"
              className="group flex max-w-md items-center gap-4 rounded-2xl bg-accent-soft/70 px-4 py-3 transition hover:bg-accent-soft"
            >
              <span className="relative size-11 shrink-0">
                <svg viewBox="0 0 36 36" className="size-11 -rotate-90">
                  <circle cx="18" cy="18" r="15" fill="none" stroke="var(--surface)" strokeWidth="4" />
                  <circle
                    cx="18"
                    cy="18"
                    r="15"
                    fill="none"
                    stroke="var(--accent-ink)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={`${(completeness.percent / 100) * 94.2} 94.2`}
                  />
                </svg>
                <span className="absolute inset-0 grid place-items-center text-[11px] font-bold">{completeness.percent}%</span>
              </span>
              <span className="text-sm">
                <b className="block">Finish your profile</b>
                <span className="text-muted">Complete profiles get better team-up requests.</span>
              </span>
              <ArrowRightIcon className="ml-auto size-4 text-accent-ink transition-transform group-hover:translate-x-1" />
            </Link>
          )}
        </div>
        <BannerArt className="mx-auto hidden w-full max-w-[420px] md:block md:max-w-none" />
      </div>
    </section>
  );
}

async function TeamsLooking() {
  const teams = (await listTeams()).slice(0, 4);

  return (
    <section className="reveal rounded-[2rem] bg-surface p-4 shadow-card sm:p-8" style={{ "--i": 1 } as React.CSSProperties}>
      <div className="mb-4 flex items-center justify-between gap-3 sm:mb-6">
        <h2 className="flex min-w-0 items-center gap-3 text-lg font-bold tracking-tight sm:text-2xl">
          <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent-ink sm:size-11">
            <TeamsIcon className="size-6" />
          </span>
          Teams looking for a teammate
        </h2>
        <Link href="/teams" className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-accent-ink">
          See all <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>

      {teams.length === 0 ? (
        <p className="rounded-2xl bg-surface-muted p-6 text-center text-muted">No teams are recruiting right now. Check back soon.</p>
      ) : (
        <ul className="stagger grid grid-cols-1 gap-3 sm:gap-4 xl:grid-cols-2">
          {teams.map((t, i) => {
            return (
              <li
                key={t.id}
                className="reveal group flex min-w-0 flex-col gap-3 rounded-3xl border border-border bg-background/20 p-4 transition duration-300 hover:-translate-y-1 hover:border-accent hover:bg-surface hover:shadow-lift sm:p-5"
              >
                <Link href={`/teams/${t.id}`} className="flex min-w-0 flex-1 items-start gap-3 sm:gap-4">
                  <span
                    className={`grid size-11 shrink-0 place-items-center rounded-2xl text-base font-bold text-surface shadow-card sm:size-14 sm:text-lg ${
                      ["bg-[#3b3163]", "bg-[#1f1d24]", "bg-[#8f7ac6]", "bg-[#66549f]"][i % 4]
                    }`}
                  >
                    {t.hackathonName
                      .split(/\s+/)
                      .map((w) => w[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-base font-semibold sm:text-lg">{t.hackathonName}</span>
                      {t.isDemo && <Chip>Sample</Chip>}
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-sm text-muted">Looking for: {t.lookingFor}</span>
                    <span className="mt-3 flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-sand px-2.5 py-1 text-xs font-medium">
                        {t.mode === "online" ? "Online" : "Offline"}
                      </span>
                      {t.ownerName && (
                        <span className="max-w-full truncate rounded-full bg-chip px-2.5 py-1 text-xs font-medium">
                          Led by {t.ownerName}
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-6">
                    <span className="hidden size-9 place-items-center rounded-full bg-accent-soft text-accent-ink transition group-hover:bg-accent group-hover:text-accent-foreground sm:grid">
                      <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                    <span className="flex items-center gap-1 text-sm font-semibold text-muted">
                      <TeamsIcon className="size-4" />
                      {t.memberCount}/{t.teamSize}
                    </span>
                  </span>
                </Link>
                <HackathonLink url={t.hackathonUrl} className="self-start" />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

