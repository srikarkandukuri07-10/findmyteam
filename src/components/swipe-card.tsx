import Link from "next/link";
import type { DiscoverCandidate } from "@/lib/discover/data";
import { initials } from "@/lib/validation/profile";
import { Chip } from "./ui";

const number = new Intl.NumberFormat("en-IN");

/** The profile card shown in the swipe deck. Purely presentational; the deck handles dragging. */
export function SwipeCard({ candidate: c }: { candidate: DiscoverCandidate }) {
  const degree = c.degree === "be" ? "B.E." : "B.Tech";

  return (
    <article className="flex h-full flex-col gap-4 overflow-hidden rounded-3xl bg-surface p-6 shadow-lift">
      <header className="flex items-center gap-4">
        <span
          aria-hidden
          className="grid size-16 shrink-0 place-items-center rounded-full bg-gradient-to-br from-accent-soft to-accent text-xl font-semibold text-accent-foreground"
        >
          {initials(c.name)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-xl font-semibold tracking-tight">{c.name}</h2>
            {c.isDemo && <Chip>Sample</Chip>}
          </div>
          <p className="truncate text-sm text-muted">
            {degree} · {c.branch}
          </p>
          <p className="truncate text-sm text-muted">
            {c.college} · Year {c.year}
          </p>
        </div>
      </header>

      <p className="rounded-2xl bg-accent-soft px-4 py-2.5 text-sm font-medium text-accent-ink">{c.reason}</p>

      {c.roles.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {c.roles.map((r) => (
            <li key={r.id}>
              <Chip tone="accent">{r.name}</Chip>
            </li>
          ))}
        </ul>
      )}

      {c.bio && <p className="line-clamp-4 break-words text-[15px] leading-relaxed">{c.bio}</p>}

      {c.skills.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {c.skills.map((s) => (
            <li key={s.id}>
              <Chip tone={s.level === "advanced" ? "sand" : "neutral"}>{s.name}</Chip>
            </li>
          ))}
        </ul>
      )}

      <footer className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-4 text-sm">
        {c.github ? (
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted">
            <span className="font-medium text-foreground">GitHub</span>
            <span>{number.format(c.github.public_repos)} repos</span>
            <span>{number.format(c.github.contributions_total)} contributions</span>
            {c.github.top_language && <span>{c.github.top_language}</span>}
          </p>
        ) : (
          <span className="text-muted">No GitHub connected</span>
        )}
        <Link
          href={`/students/${c.id}`}
          draggable={false}
          className="shrink-0 font-medium text-accent-ink underline-offset-2 hover:underline"
        >
          Full profile
        </Link>
      </footer>
    </article>
  );
}
