import type { Metadata } from "next";
import { PageTransition } from "@/components/page-transition";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Help" };

const ANSWERS = [
  {
    q: "How does Scout work?",
    a: "Scout shows you one student at a time. Swipe right (or tap ✓) to send a team-up request; swipe left (or tap ✕) to skip. Skipping is private, and a skipped student can come back after 7 days.",
  },
  {
    q: "How many requests can I send?",
    a: "Up to 25 a day. Requests you don't hear back on expire after 14 days, so you can try again later.",
  },
  {
    q: "Who can see my email?",
    a: "Nobody. Other students see your name, college, branch, year, skills, roles and anything you add to your profile, never your email. We don't collect phone numbers.",
  },
  {
    q: "How do I join a team?",
    a: "Open Teams to see who is recruiting and which spots are open. Joining from a team page is coming soon; for now, send a request to its members from Scout or their profile.",
  },
  {
    q: "What is Pro?",
    a: "Pro will let you pitch a hackathon project to verified investors on FindMyTeam. It isn't available yet. Everything else is free.",
  },
];

export default function HelpPage() {
  return (
    <PageTransition>
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 pb-12 pt-6 sm:px-6">
        <PageHeader title="Help & support" subtitle="Quick answers. More help is on the way." />
        <ul className="stagger space-y-3">
          {ANSWERS.map((x) => (
            <li key={x.q} className="reveal rounded-3xl bg-surface p-6 shadow-card">
              <h2 className="font-semibold">{x.q}</h2>
              <p className="mt-2 text-muted">{x.a}</p>
            </li>
          ))}
        </ul>
      </main>
    </PageTransition>
  );
}
