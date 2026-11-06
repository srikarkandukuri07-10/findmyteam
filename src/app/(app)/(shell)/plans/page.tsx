import type { Metadata } from "next";
import { CheckIcon, SparkIcon } from "@/components/icons";
import { PageTransition } from "@/components/page-transition";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Plans" };

/** Display only (D20): no payments yet. The Pro price is the founder's working figure. */
const PRO_PRICE = "₹1,299";

const FREE = [
  "Scout: swipe through students from other colleges",
  "Up to 25 team-up requests a day",
  "Search people, teams and skills",
  "Your profile with skills, roles and GitHub",
  "Accept requests and message your connections",
  "Browse teams and join one that needs you",
  "Follow the hackathons you care about",
];

const PRO = [
  "Pitch your hackathon project to verified investors",
  "Your pitch reviewed by investors on FindMyTeam",
  "Pro badge on your profile",
];

export default function PlansPage() {
  return (
    <PageTransition>
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-8 px-4 pb-12 pt-6 sm:px-6">
        <PageHeader title="Plans" subtitle="Everything you need to find a team is free. Pro is for taking your project further." />

        <div className="grid items-stretch gap-6 md:grid-cols-2">
          <section className="reveal flex flex-col rounded-[2rem] bg-surface p-8 shadow-card">
            <p className="text-sm font-bold uppercase tracking-widest text-muted">Free</p>
            <p className="mt-3 flex items-end gap-2">
              <span className="text-5xl font-bold tracking-tight">₹0</span>
              <span className="pb-1.5 text-muted">forever</span>
            </p>
            <p className="mt-3 text-muted">For every B.Tech and B.E. student.</p>
            <ul className="mt-7 space-y-3.5">
              {FREE.map((f) => (
                <li key={f} className="flex items-start gap-3">
                  <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-accent-soft text-accent-ink">
                    <CheckIcon className="size-3.5" strokeWidth={2.6} />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
            <span className="mt-auto block pt-8">
              <span className="block w-full rounded-full bg-chip py-3.5 text-center font-semibold text-muted">Your current plan</span>
            </span>
          </section>

          <section
            className="reveal relative flex flex-col overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#2f2848] via-[#3b3163] to-[#66549f] p-8 text-surface shadow-lift"
            style={{ "--i": 1 } as React.CSSProperties}
          >
            <div aria-hidden className="drift absolute -right-16 -top-16 size-64 rounded-full bg-accent/40 blur-3xl" />
            <div aria-hidden className="drift-slow absolute -bottom-20 -left-10 size-56 rounded-full bg-accent-soft/20 blur-3xl" />
            <div className="relative flex items-center justify-between">
              <p className="text-sm font-bold uppercase tracking-widest text-accent-soft">Pro</p>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
                <SparkIcon className="size-3.5" /> Coming soon
              </span>
            </div>
            <p className="relative mt-3 flex items-end gap-2">
              <span className="text-5xl font-bold tracking-tight">{PRO_PRICE}</span>
            </p>
            <p className="relative mt-3 text-accent-soft">Everything in Free, plus:</p>
            <ul className="relative mt-7 space-y-3.5">
              {PRO.map((f) => (
                <li key={f} className="flex items-start gap-3">
                  <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
                    <CheckIcon className="size-3.5" strokeWidth={2.6} />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
            <p className="relative mt-6 rounded-2xl bg-white/10 p-4 text-sm text-accent-soft">
              Every pitch is reviewed before it reaches investors, so only strong ideas are shown. Pitching is for
              students aged 18 and over.
            </p>
            <span className="relative mt-auto block pt-8">
              <span className="block w-full rounded-full bg-white/90 py-3.5 text-center font-bold text-[#2f2848]">
                Available soon
              </span>
            </span>
          </section>
        </div>
      </main>
    </PageTransition>
  );
}
