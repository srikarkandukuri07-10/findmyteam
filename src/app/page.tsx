import Link from "next/link";
import { Logo } from "@/components/logo";
import { APP_TAGLINE } from "@/lib/brand";

const POINTS = [
  { title: "Beyond your college", body: "Meet designers, ML engineers and builders from other campuses." },
  { title: "Skills that fit", body: "See what someone can contribute, their projects and past hackathons." },
  { title: "Join or recruit", body: "Find a teammate one-on-one, or join a team with an open spot." },
];

export default function LandingPage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4">
        <Logo />
        <Link href="/login" className="text-sm font-medium text-muted hover:text-foreground">
          Log in
        </Link>
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-4 py-16">
        <p className="text-sm font-semibold text-accent">For B.Tech and B.E. students</p>
        <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">{APP_TAGLINE}</h1>
        <p className="mt-4 max-w-xl text-lg text-muted">
          Stop forming the same team with the same friends. Find people whose skills complete yours.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/signup"
            className="rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground hover:bg-accent-hover"
          >
            Create your account
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-border bg-surface px-5 py-3 text-sm font-semibold hover:border-muted"
          >
            Log in
          </Link>
        </div>
        <ul className="mt-16 grid gap-4 sm:grid-cols-3">
          {POINTS.map((p) => (
            <li key={p.title} className="rounded-2xl border border-border bg-surface p-5">
              <h2 className="font-semibold">{p.title}</h2>
              <p className="mt-1.5 text-sm text-muted">{p.body}</p>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
