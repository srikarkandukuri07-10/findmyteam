import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { Faq } from "@/components/landing/faq";
import { HeroDeck } from "@/components/landing/hero-deck";
import { Reveal } from "@/components/landing/reveal";
import { WaitlistForm } from "@/components/landing/waitlist-form";
import { APP_NAME } from "@/lib/brand";
import { getWaitlistOptions, getWaitlistStats } from "@/lib/waitlist/data";
import { isWaitlistMode } from "@/lib/waitlist/mode";

const ROLES = [
  "UI/UX designer",
  "Frontend",
  "Backend",
  "ML engineer",
  "App developer",
  "Pitch person",
  "Hardware",
  "Data analyst",
  "DevOps",
  "Product",
  "Cybersecurity",
  "Blockchain",
];

const STEPS = [
  {
    title: "Show what you bring",
    body: "Your skills, the role you want and your GitHub, in one card. Takes two minutes.",
  },
  {
    title: "Swipe students from other colleges",
    body: "Right sends a team-up request. Left skips, and nobody is told.",
  },
  {
    title: "Team up and build",
    body: "Accept a request, or join a team that's already building for your hackathon.",
  },
];

const FEATURES = [
  { icon: "↔", title: "Discover", body: "One card at a time: students whose skills complete yours, from colleges across the city." },
  { icon: "✉", title: "Requests", body: "Send and accept team-up requests. A skip is private, so there's no awkwardness." },
  { icon: "◎", title: "Teams", body: "Browse teams recruiting for a hackathon and see exactly which spots are open." },
  { icon: "</>", title: "Real profiles", body: "Connect GitHub to show your repos and contribution graph, not just a list of skills." },
];

const AVENGERS = [
  { name: "Iron Man", chip: "HTML · Beginner" },
  { name: "Thor", chip: "VS Code: opened 6 months ago" },
  { name: "Hulk", chip: "PowerPoint · Expert" },
  { name: "Captain America", chip: "“What's the problem statement?”" },
];

export default async function LandingPage() {
  // D26: once the lock is off (launch), the page invites students to sign up instead of joining the waitlist.
  const open = !isWaitlistMode();
  const [options, stats] = open
    ? [null, { total: 0 }]
    : await Promise.all([getWaitlistOptions(), getWaitlistStats()]);

  return (
    <div className="relative flex flex-1 flex-col overflow-x-clip">
      {/* Soft light behind everything. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[900px] overflow-hidden">
        <div className="drift absolute -left-40 -top-32 size-[520px] rounded-full bg-accent/40 blur-3xl" />
        <div className="drift-slow absolute -right-32 top-40 size-[460px] rounded-full bg-accent-soft/80 blur-3xl" />
        <div className="drift absolute left-1/3 top-[520px] size-[380px] rounded-full bg-surface/60 blur-3xl" />
      </div>

      <header className="sticky top-0 z-40 px-4 pt-4">
        <nav className="mx-auto flex w-full max-w-6xl items-center justify-between rounded-full bg-surface/85 px-3 py-2 shadow-card backdrop-blur-md sm:px-4">
          <Link href="/" className="flex items-center gap-2.5" aria-label={`${APP_NAME} home`}>
            <Image src="/brand/fmt-mark.png" alt="" width={68} height={42} className="h-9 w-auto rounded-lg" priority />
            <span className="text-lg font-semibold tracking-tight">
              Find<span className="text-accent-ink">My</span>Team
            </span>
          </Link>
          {open ? (
            <div className="flex items-center gap-1.5">
              <Link href="/login" className="rounded-full px-4 py-2 text-sm font-semibold transition hover:bg-surface-muted">
                Log in
              </Link>
              <Link
                href="/login"
                className="rounded-full bg-accent px-4 py-2 text-sm font-bold text-accent-foreground transition hover:bg-accent-hover active:scale-95 sm:px-5"
              >
                Sign up
              </Link>
            </div>
          ) : (
            <a
              href="#join"
              className="rounded-full bg-accent px-4 py-2 text-sm font-bold text-accent-foreground transition hover:bg-accent-hover active:scale-95 sm:px-5"
            >
              Join the waitlist
            </a>
          )}
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pb-16 pt-12 lg:grid-cols-[1.1fr_1fr] lg:pt-20">
          <div className="space-y-7">
            <div className="reveal">
              <p className="inline-flex items-center gap-2.5 rounded-full bg-surface px-4 py-1.5 text-sm font-semibold shadow-card">
                <span className="pulse-dot size-2.5 rounded-full bg-accent-ink" />
                {open ? "Now open" : "Launching soon"} · for B.Tech &amp; B.E. students
              </p>
            </div>
            <div className="reveal" style={{ "--i": 1 } as CSSProperties}>
              <h1 className="text-5xl font-bold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
                Find your hackathon team.
                <span className="mt-2 block text-accent-ink">Beyond your friend circle.</span>
              </h1>
            </div>
            <div className="reveal" style={{ "--i": 2 } as CSSProperties}>
              <p className="max-w-xl text-lg text-muted sm:text-xl">
                See students from other colleges, with their skills, roles and GitHub. Swipe right to team up. Build
                something that actually wins.
              </p>
            </div>
            <div className="reveal" style={{ "--i": 3 } as CSSProperties}>
              <div className="flex flex-wrap items-center gap-4">
                <a
                  href={open ? "/login" : "#join"}
                  className="relative overflow-hidden rounded-full bg-accent px-8 py-4 text-base font-bold text-accent-foreground shadow-lift transition hover:-translate-y-0.5 hover:bg-accent-hover active:scale-95"
                >
                  <span className="relative z-10">{open ? "Sign up free" : "Join the waitlist"}</span>
                  <span aria-hidden className="button-shine absolute inset-0" />
                </a>
                <a href="#how" className="rounded-full px-5 py-4 text-base font-semibold text-foreground transition hover:bg-surface/70">
                  How it works ↓
                </a>
              </div>
            </div>
            {!open && stats.total >= 50 && (
              <div className="reveal" style={{ "--i": 4 } as CSSProperties}>
                <p className="text-sm font-medium text-muted">
                  <b className="text-foreground">{stats.total.toLocaleString("en-IN")}</b> students are already waiting.
                </p>
              </div>
            )}
          </div>
          <div className="reveal" style={{ "--i": 3 } as CSSProperties}>
            <HeroDeck />
          </div>
        </section>

        {/* Roles band */}
        <div aria-hidden className="overflow-hidden border-y border-surface/60 bg-surface/50 py-4">
          <div className="marquee flex w-max gap-3">
            {[...ROLES, ...ROLES].map((r, i) => (
              <span key={i} className="whitespace-nowrap rounded-full bg-surface px-4 py-2 text-sm font-semibold text-accent-ink shadow-card">
                {r}
              </span>
            ))}
          </div>
        </div>

        {/* The problem, as in the reel */}
        <section className="mx-auto w-full max-w-6xl px-4 py-20">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <Reveal className="space-y-4">
              <p className="text-sm font-bold uppercase tracking-widest text-accent-ink">Sound familiar?</p>
              <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">You assembled the Avengers. Then round one happened.</h2>
              <p className="text-lg text-muted">
                Your friends are great, but a hackathon needs a designer, a backend dev and someone who can pitch. Those
                people are out there. Usually in the college next door.
              </p>
            </Reveal>
            <Reveal from="below" delay={0.1}>
              <div className="relative grid grid-cols-2 gap-3">
                {AVENGERS.map((a) => (
                  <div key={a.name} className="lift rounded-3xl bg-surface p-4 shadow-card">
                    <p className="font-semibold">{a.name}</p>
                    <p className="mt-2 inline-block rounded-2xl bg-sand px-3 py-1.5 text-xs font-semibold">{a.chip}</p>
                  </div>
                ))}
                <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-6 whitespace-nowrap rounded-2xl border-[6px] border-danger bg-surface/90 px-5 py-2 text-2xl font-black tracking-wider text-danger shadow-lift sm:text-3xl">
                  ELIMINATED
                </span>
              </div>
            </Reveal>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="mx-auto w-full max-w-6xl scroll-mt-28 px-4 pb-20">
          <Reveal className="mb-10 max-w-2xl space-y-3">
            <p className="text-sm font-bold uppercase tracking-widest text-accent-ink">How it works</p>
            <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">From strangers to teammates in three steps.</h2>
          </Reveal>
          <ol className="grid gap-4 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title}>
                <Reveal delay={i * 0.1} className="h-full">
                  <div className="lift h-full rounded-3xl bg-surface p-7 shadow-card">
                    <span className="grid size-12 place-items-center rounded-2xl bg-accent text-xl font-bold text-accent-foreground">
                      {i + 1}
                    </span>
                    <h3 className="mt-5 text-xl font-semibold tracking-tight">{s.title}</h3>
                    <p className="mt-2 text-muted">{s.body}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
        </section>

        {/* Features */}
        <section className="mx-auto w-full max-w-6xl px-4 pb-20">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 0.08} className="h-full">
                <div className="lift h-full rounded-3xl bg-surface/80 p-6 shadow-card">
                  <span aria-hidden className="grid size-11 place-items-center rounded-full bg-accent-soft font-bold text-accent-ink">
                    {f.icon}
                  </span>
                  <h3 className="mt-4 font-semibold">{f.title}</h3>
                  <p className="mt-1.5 text-sm text-muted">{f.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Join */}
        <section id="join" className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 pb-20">
          <div className="grid gap-8 rounded-[2.5rem] bg-surface p-6 shadow-lift sm:p-10 lg:grid-cols-[0.8fr_1.2fr] lg:p-12">
            <Reveal className="space-y-6">
              <Image src="/brand/fmt-logo.png" alt={`${APP_NAME} logo`} width={640} height={640} className="w-40 rounded-3xl shadow-card sm:w-48" />
              <div className="space-y-3">
                <h2 className="text-4xl font-bold tracking-tight">
                  {open ? "Your next teammate is already here." : "Get in before your college opens."}
                </h2>
                <p className="text-muted">
                  {open
                    ? "Sign up with Google, set up your profile in three quick steps, and start Scouting."
                    : "We're opening college by college. Join now and you'll be first in when yours goes live."}
                </p>
              </div>
              <ul className="space-y-3 text-sm font-medium">
                {(open
                  ? ["Students from colleges across India", "Verified student badge with your college email", "Free: Scout, requests, teams and chat"]
                  : [
                      "Early access the day your college opens",
                      "A Founding member badge on your profile",
                      "Move up 10 places for every friend who joins",
                    ]
                ).map((perk) => (
                  <li key={perk} className="flex items-center gap-3">
                    <span aria-hidden className="grid size-6 shrink-0 place-items-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
                      ✓
                    </span>
                    {perk}
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal from="below" delay={0.1}>
              {open || !options ? <SignUpPanel /> : <WaitlistForm options={options} stats={stats} />}
            </Reveal>
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto w-full max-w-3xl px-4 pb-24">
          <Reveal className="mb-8 text-center">
            <h2 className="text-4xl font-bold tracking-tight">Questions</h2>
          </Reveal>
          <Reveal from="below">
            <Faq />
          </Reveal>
        </section>
      </main>

      <footer className="px-4 pb-8">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 rounded-3xl bg-surface/70 px-6 py-5 text-sm text-muted">
          <span>
            © 2026 {APP_NAME}. Discover · Connect · Build.
          </span>
          <span className="flex gap-5">
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
          </span>
        </div>
      </footer>
    </div>
  );
}

/** D26: what the join section shows once sign-ups are open. */
function SignUpPanel() {
  return (
    <div className="flex h-full flex-col justify-center gap-5 rounded-[2rem] bg-accent-soft p-8 text-center">
      <p className="text-2xl font-bold tracking-tight">Find your hackathon team today.</p>
      <p className="text-muted">One Google sign-in. No passwords.</p>
      <Link
        href="/login"
        className="mx-auto rounded-full bg-accent px-8 py-4 text-base font-bold text-accent-foreground shadow-lift transition hover:-translate-y-0.5 hover:bg-accent-hover active:scale-95"
      >
        Sign up with Google
      </Link>
      <p className="text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-accent-ink">
          Log in
        </Link>
      </p>
    </div>
  );
}
