import Link from "next/link";
import { setInterest } from "@/app/(app)/hackathons/actions";
import type { HackathonRow } from "@/lib/hackathons/data";
import { MODE_LABELS, formatDateRange, hackathonPhase, phaseLabel } from "@/lib/hackathons/dates";
import { Card, Chip, buttonStyles } from "./ui";

export function PhaseChip({ hackathon, today }: { hackathon: HackathonRow; today: string }) {
  const phase = hackathonPhase(hackathon.starts_on, hackathon.ends_on, today);
  return (
    <Chip tone={phase === "ongoing" ? "success" : phase === "upcoming" ? "accent" : "neutral"}>
      {phaseLabel(hackathon.starts_on, hackathon.ends_on, today)}
    </Chip>
  );
}

export function InterestButton({ hackathon }: { hackathon: HackathonRow }) {
  return (
    <form action={setInterest}>
      <input type="hidden" name="id" value={hackathon.id} />
      <input type="hidden" name="interested" value={String(!hackathon.is_interested)} />
      <button
        type="submit"
        aria-pressed={hackathon.is_interested}
        className={hackathon.is_interested ? buttonStyles.secondary : buttonStyles.primary}
      >
        {hackathon.is_interested ? "✓ Interested" : "I'm interested"}
      </button>
    </form>
  );
}

export function interestText(count: number) {
  return count === 1 ? "1 student interested" : `${count} students interested`;
}

export function HackathonCard({ hackathon, today }: { hackathon: HackathonRow; today: string }) {
  return (
    <Card className="lift flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <PhaseChip hackathon={hackathon} today={today} />
        <Chip tone="sand">{MODE_LABELS[hackathon.mode]}</Chip>
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold leading-snug tracking-tight">
          <Link href={`/hackathons/${hackathon.id}`} className="hover:text-accent-ink">
            {hackathon.name}
          </Link>
        </h2>
        <p className="text-sm text-muted">
          {formatDateRange(hackathon.starts_on, hackathon.ends_on)}
          {hackathon.city ? ` · ${hackathon.city}` : ""}
        </p>
        {hackathon.organizer && <p className="text-sm text-muted">By {hackathon.organizer}</p>}
      </div>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-1">
        <p className="text-sm text-muted">{interestText(hackathon.interest_count)}</p>
        <InterestButton hackathon={hackathon} />
      </div>
    </Card>
  );
}
