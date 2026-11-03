import Link from "next/link";
import { Logo } from "@/components/logo";
import { ButtonLink, Card, Chip } from "@/components/ui";
import { APP_TAGLINE } from "@/lib/brand";

const REASONS = [
  {
    title: "Beyond your college",
    body: "Meet designers, ML engineers and builders from other campuses, not just your classmates.",
  },
  {
    title: "Skills that complete yours",
    body: "See what someone can actually contribute: projects, past hackathons and the role they want.",
  },
  {
    title: "Join a team or build one",
    body: "Find one teammate, or browse teams that are recruiting for the hackathon you're targeting.",
  },
];

const STEPS = [
  { n: "1", title: "Sign up", body: "Use your email and tell us your B.Tech or B.E. details." },
  { n: "2", title: "Pick a hackathon", body: "Follow the events you want to compete in." },
  { n: "3", title: "Find your people", body: "Browse profiles and teams that fit what you're missing." },
  { n: "4", title: "Team up", body: "Send a request. Once accepted, chat and plan." },
];

export default function LandingPage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="px-4 pt-4">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between rounded-full bg-surface px-4 py-2.5 shadow-card sm:pl-5">
          <Logo />
          <div className="flex items-center gap-1.5">
            <ButtonLink href="/login" variant="ghost">
              Log in
            </ButtonLink>
            <ButtonLink href="/signup">Sign up</ButtonLink>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-4">
        <section className="grid gap-4 lg:grid-cols-5">
          <Card className="flex flex-col justify-center gap-6 py-10 sm:p-10 lg:col-span-3">
            <div className="self-start">
              <Chip tone="accent">For B.Tech and B.E. students</Chip>
            </div>
            <h1 className="max-w-xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">{APP_TAGLINE}</h1>
            <p className="max-w-lg text-lg text-muted">
              Stop forming the same team with the same friends. Find people whose skills complete yours, for the
              hackathons you actually want to win.
            </p>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/signup" className="px-7 py-3">
                Create your account
              </ButtonLink>
              <ButtonLink href="/login" variant="secondary" className="px-7 py-3">
                Log in
              </ButtonLink>
            </div>
          </Card>

          <div className="grid gap-4 lg:col-span-2" aria-label="Preview of what is coming">
            <Card className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted">Profile card</p>
                <Chip>Preview</Chip>
              </div>
              <div className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="grid size-12 place-items-center rounded-full bg-accent-soft text-sm font-semibold text-accent"
                >
                  AR
                </span>
                <div>
                  <p className="font-semibold">Example student</p>
                  <p className="text-sm text-muted">ML engineer · 3rd year</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Chip>Python</Chip>
                <Chip>PyTorch</Chip>
                <Chip>OpenCV</Chip>
              </div>
              <p className="rounded-2xl bg-accent-soft px-4 py-3 text-sm text-accent">
                Why you match: complements your frontend skills.
              </p>
            </Card>
            <Card className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted">Team looking for a member</p>
                <Chip>Preview</Chip>
              </div>
              <p className="font-semibold">Example team</p>
              <p className="text-sm text-muted">Needs: backend developer · 1 spot open</p>
              <div className="flex flex-wrap gap-2">
                <Chip tone="success">Open</Chip>
                <Chip tone="sand">Hybrid</Chip>
              </div>
            </Card>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {REASONS.map((r) => (
            <Card key={r.title} className="space-y-2">
              <h2 className="text-lg font-semibold tracking-tight">{r.title}</h2>
              <p className="text-sm text-muted">{r.body}</p>
            </Card>
          ))}
        </section>

        <Card className="space-y-6 sm:p-8">
          <h2 className="text-xl font-semibold tracking-tight">How it works</h2>
          <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <li key={s.n} className="space-y-2">
                <span className="grid size-9 place-items-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
                  {s.n}
                </span>
                <p className="font-semibold">{s.title}</p>
                <p className="text-sm text-muted">{s.body}</p>
              </li>
            ))}
          </ol>
        </Card>
      </main>

      <footer className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-sm">
        <p>FindMyTeam</p>
        <div className="flex gap-5">
          <Link href="/terms" className="hover:underline">
            Terms
          </Link>
          <Link href="/privacy" className="hover:underline">
            Privacy
          </Link>
        </div>
      </footer>
    </div>
  );
}
