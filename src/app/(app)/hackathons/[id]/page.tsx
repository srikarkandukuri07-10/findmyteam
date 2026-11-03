import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { InterestButton, PhaseChip, interestText } from "@/components/hackathon";
import { Card, Chip } from "@/components/ui";
import { requireOnboardedProfile } from "@/lib/auth/dal";
import { getHackathon } from "@/lib/hackathons/data";
import { MODE_LABELS, formatDateRange, todayInIndia } from "@/lib/hackathons/dates";

export const metadata: Metadata = { title: "Hackathon" };

export default function HackathonPage(props: PageProps<"/hackathons/[id]">) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-4 px-4 py-8">
      <Link href="/hackathons" className="inline-block text-sm font-medium text-foreground hover:text-accent">
        ← All hackathons
      </Link>
      <Suspense fallback={<p className="text-sm">Loading…</p>}>
        <HackathonDetails params={props.params} />
      </Suspense>
    </main>
  );
}

async function HackathonDetails({ params }: { params: PageProps<"/hackathons/[id]">["params"] }) {
  await requireOnboardedProfile();
  const { id } = await params;
  const hackathon = await getHackathon(id);
  const today = todayInIndia();

  return (
    <Card className="space-y-6 sm:p-8">
      <div className="flex flex-wrap items-center gap-2">
        <PhaseChip hackathon={hackathon} today={today} />
        <Chip tone="sand">{MODE_LABELS[hackathon.mode]}</Chip>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{hackathon.name}</h1>
        {hackathon.organizer && <p className="text-muted">Organized by {hackathon.organizer}</p>}
      </div>

      <dl className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-surface-muted p-4">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted">When</dt>
          <dd className="mt-1 font-medium">{formatDateRange(hackathon.starts_on, hackathon.ends_on)}</dd>
        </div>
        <div className="rounded-2xl bg-surface-muted p-4">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted">Where</dt>
          <dd className="mt-1 font-medium">
            {MODE_LABELS[hackathon.mode]}
            {hackathon.city ? ` · ${hackathon.city}` : ""}
          </dd>
        </div>
      </dl>

      {hackathon.url && (
        <p className="text-sm">
          <a
            href={hackathon.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="break-all font-medium text-accent underline-offset-2 hover:underline"
          >
            Official page ↗
          </a>
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-5">
        <p className="text-sm text-muted">{interestText(hackathon.interest_count)}</p>
        <InterestButton hackathon={hackathon} />
      </div>
    </Card>
  );
}
