import Link from "next/link";
import { formatShortDate } from "@/lib/hackathons/dates";
import { RECRUIT_LABELS, type TeamSummary } from "@/lib/teams/data";
import { initials } from "@/lib/validation/profile";
import { Card, Chip } from "./ui";

/** One team in the directory. */
export function TeamCard({ team }: { team: TeamSummary }) {
  const tone = team.status === "open" || team.status === "partially_filled" ? "accent" : "neutral";
  return (
    <Link href={`/teams/${team.id}`} className="block h-full">
      <Card className="lift flex h-full flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold tracking-tight">{team.name}</h2>
            <p className="truncate text-sm text-muted">
              {team.hackathonName} · {formatShortDate(team.hackathonStartsOn)}
            </p>
          </div>
          <Chip tone={tone}>{RECRUIT_LABELS[team.status]}</Chip>
        </div>

        {team.description && <p className="line-clamp-3 text-sm leading-relaxed">{team.description}</p>}

        {team.positions.length > 0 && (
          <ul className="flex flex-wrap gap-2" aria-label="Open positions">
            {team.positions.map((p) => (
              <li key={p.role}>
                <Chip tone="sand">
                  {p.role}
                  {p.spots > 1 ? ` ×${p.spots}` : ""}
                </Chip>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-auto flex items-center justify-between gap-3 pt-1">
          <ul className="flex -space-x-2" aria-label="Members">
            {team.members.slice(0, 5).map((m) => (
              <li
                key={m.id}
                title={m.name}
                className="grid size-9 place-items-center rounded-full border-2 border-surface bg-gradient-to-br from-accent-soft to-accent text-xs font-semibold text-accent-foreground"
              >
                {initials(m.name)}
              </li>
            ))}
          </ul>
          <span className="flex items-center gap-2 text-xs text-muted">
            {team.memberCount} {team.memberCount === 1 ? "member" : "members"}
            {team.isDemo && <Chip>Sample</Chip>}
          </span>
        </div>
      </Card>
    </Link>
  );
}
