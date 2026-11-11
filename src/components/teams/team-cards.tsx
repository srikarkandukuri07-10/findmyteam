import Link from "next/link";
import { StudentAvatar } from "@/components/student-avatar";
import { Card, Chip } from "@/components/ui";
import { MODE_LABELS, RECRUIT_LABELS, type BrowseTeam, type MyTeam, type TeamFace } from "@/lib/teams/data";
import { JoinButton } from "./team-controls";

/** The hackathon's official page, opened in a new tab. Shows the site name so people know where it goes. */
export function HackathonLink({ url, className = "" }: { url: string | null; className?: string }) {
  if (!url) return null;
  let host = url;
  try {
    host = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      title={url}
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent-ink transition-colors hover:bg-accent hover:text-accent-foreground ${className}`}
    >
      <svg viewBox="0 0 24 24" aria-hidden className="size-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.2}>
        <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="truncate">Event page · {host}</span>
    </a>
  );
}

export function Faces({ members, max = 5 }: { members: TeamFace[]; max?: number }) {
  return (
    <ul className="flex -space-x-2" aria-label="Members">
      {members.slice(0, max).map((m) => (
        <li key={m.id} title={m.name}>
          <StudentAvatar id={m.id} name={m.name} avatarPath={m.avatar_path} size="sm" className="size-9 ring-2 ring-surface" />
        </li>
      ))}
      {members.length > max && (
        <li className="grid size-9 place-items-center rounded-full bg-chip text-xs font-semibold ring-2 ring-surface">
          +{members.length - max}
        </li>
      )}
    </ul>
  );
}

/** How full the team is: a bar plus "3 of 4". */
export function SeatMeter({ count, size }: { count: number; size: number }) {
  const pct = Math.min(100, Math.round((count / size) * 100));
  return (
    <div className="space-y-1">
      <div className="h-1.5 overflow-hidden rounded-full bg-chip">
        <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-muted">
        {count} of {size} members{count < size ? ` · ${size - count} ${size - count === 1 ? "spot" : "spots"} open` : ""}
      </p>
    </div>
  );
}

/** One of my teams on the Teams tab: role, how full, requests waiting and unread chat. */
export function MyTeamCard({ team }: { team: MyTeam }) {
  return (
    <Card className={`lift flex h-full flex-col gap-4 ${team.completed ? "opacity-75" : ""}`}>
      <Link href={`/teams/${team.id}`} className="block space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone={team.isOwner ? "accent" : "neutral"}>{team.isOwner ? "You lead" : "Member"}</Chip>
          <Chip tone="sand">{MODE_LABELS[team.mode]}</Chip>
          {team.completed ? (
            <Chip tone="success">Completed</Chip>
          ) : (
            <Chip>{RECRUIT_LABELS[team.recruitStatus]}</Chip>
          )}
        </div>
        <h3 className="line-clamp-2 text-lg font-semibold tracking-tight">{team.hackathonName}</h3>
      </Link>
      <HackathonLink url={team.hackathonUrl} className="self-start" />
      <Link href={`/teams/${team.id}`} className="block space-y-3">
        <p className="line-clamp-2 text-sm text-muted">{team.about}</p>
        <SeatMeter count={team.memberCount} size={team.teamSize} />
      </Link>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
        <Faces members={team.members} />
        <div className="flex flex-wrap items-center gap-2">
          {team.isOwner && team.pendingCount > 0 && (
            <Link
              href={`/teams/${team.id}#requests`}
              className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1.5 text-xs font-bold text-accent-ink"
            >
              <span className="pulse-dot size-2 rounded-full bg-accent-ink" />
              {team.pendingCount} {team.pendingCount === 1 ? "request" : "requests"}
            </Link>
          )}
          {team.conversationId && (
            <Link
              href={`/messages/${team.conversationId}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-1.5 text-xs font-bold text-accent-foreground"
            >
              Team chat
              {team.unread > 0 && (
                <span className="grid min-w-5 place-items-center rounded-full bg-surface px-1 text-[10px] text-accent-ink">
                  {team.unread > 99 ? "99+" : team.unread}
                </span>
              )}
            </Link>
          )}
        </div>
      </div>
    </Card>
  );
}

/** A team looking for people, with Request to join right on the card. */
export function BrowseTeamCard({ team }: { team: BrowseTeam }) {
  return (
    <Card className="flex h-full flex-col gap-4">
      <Link href={`/teams/${team.id}`} className="group block space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone="sand">{MODE_LABELS[team.mode]}</Chip>
          <Chip tone="accent">{RECRUIT_LABELS[team.status]}</Chip>
          {team.isDemo && <Chip>Sample</Chip>}
        </div>
        <div>
          <h3 className="line-clamp-2 text-lg font-semibold tracking-tight group-hover:text-accent-ink">
            {team.hackathonName}
          </h3>
          {team.ownerName && <p className="text-sm text-muted">Led by {team.ownerName}</p>}
        </div>
      </Link>
      <HackathonLink url={team.hackathonUrl} className="self-start" />
      <Link href={`/teams/${team.id}`} className="block space-y-3">
        <p className="line-clamp-3 text-sm leading-relaxed">{team.about}</p>
        <div className="rounded-2xl bg-surface-muted px-3.5 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Looking for</p>
          <p className="line-clamp-2 text-sm">{team.lookingFor}</p>
        </div>
        <SeatMeter count={team.memberCount} size={team.teamSize} />
      </Link>
      <div className="mt-auto flex flex-wrap items-end justify-between gap-3">
        <Faces members={team.members} max={4} />
        <JoinButton teamId={team.id} myRequest={team.myRequest} isDemo={team.isDemo} canJoin compact />
      </div>
    </Card>
  );
}
