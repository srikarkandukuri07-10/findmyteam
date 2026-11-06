import Link from "next/link";
import { VerifiedStudentBadge } from "@/components/verified-badge";
import type { DiscoverCandidate } from "@/lib/discover/data";
import { avatarSrc } from "@/lib/avatar";

const number = new Intl.NumberFormat("en-IN");

/**
 * One Scout card. The front leads with the photo (or illustrated avatar), name and why they fit;
 * the back, shown when the card flips, has the full bio, every skill and GitHub numbers.
 * Purely presentational: the deck handles dragging and flipping.
 */
export function ScoutCardFront({ c }: { c: DiscoverCandidate }) {
  const degree = c.degree === "be" ? "B.E." : "B.Tech";
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-[2rem] bg-surface shadow-[0_30px_80px_-30px_rgb(20_10_50/0.65)]">
      <div className="relative h-[54%] shrink-0 overflow-hidden bg-gradient-to-br from-accent-soft via-[#d9cdf0] to-[#b9a6e3]">
        {/* Illustrated avatars stand on the gradient; photos fill the frame. */}
        {!c.avatarPath && (
          <div
            aria-hidden
            className="absolute left-1/2 top-[6%] aspect-square h-[62%] -translate-x-1/2 rounded-full bg-surface/50 blur-2xl"
          />
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarSrc(c.id, c.avatarPath, { transparent: true })}
          alt=""
          draggable={false}
          className={
            c.avatarPath
              ? "absolute inset-0 h-full w-full object-cover"
              : "absolute inset-x-0 top-1 mx-auto h-[74%] w-auto object-contain"
          }
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#1f1b2e]/90 via-[#1f1b2e]/45 to-transparent"
        />
        {c.isDemo && (
          <span className="absolute left-4 top-4 rounded-full bg-surface/85 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-foreground backdrop-blur">
            Sample
          </span>
        )}
        {c.githubVerified && (
          <span className="absolute right-4 top-4 rounded-full bg-[#1f1b2e]/70 px-3 py-1 text-[11px] font-semibold text-surface backdrop-blur">
            GitHub verified
          </span>
        )}
        <div className="absolute inset-x-5 bottom-3 text-surface">
          {c.collegeVerified && <VerifiedStudentBadge tone="glass" className="mb-1.5" />}
          <h2 className="truncate text-[1.75rem] font-bold leading-tight tracking-tight drop-shadow">{c.name}</h2>
          <p className="mt-0.5 truncate text-sm font-medium text-surface/85">
            {degree} · {c.branch} · Year {c.year}
          </p>
          <p className="truncate text-sm text-surface/75">{c.college}</p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-hidden p-4 sm:gap-3 sm:p-5">
        <p className="shrink-0 truncate rounded-2xl bg-accent-soft px-3.5 py-2 text-sm font-semibold text-accent-ink">
          {c.reason}
        </p>
        {c.roles.length > 0 && (
          <ul className="flex max-h-7 shrink-0 flex-wrap gap-1.5 overflow-hidden">
            {c.roles.map((r) => (
              <li key={r.id} className="rounded-full bg-[#3b3163] px-3 py-1 text-xs font-semibold text-surface">
                {r.name}
              </li>
            ))}
          </ul>
        )}
        {c.skills.length > 0 && (
          // At most two rows; the back of the card lists every skill.
          <ul className="flex max-h-[3.75rem] min-h-0 flex-wrap gap-1.5 overflow-hidden">
            {c.skills.slice(0, 6).map((s) => (
              <li
                key={s.id}
                className={`rounded-full px-3 py-1 text-xs font-medium ${s.level === "advanced" ? "bg-sand" : "bg-chip"}`}
              >
                {s.name}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-auto flex items-center justify-between text-xs text-muted">
          <span>Tap ⓘ for more</span>
          {c.github && (
            <span>
              <b className="text-foreground">{number.format(c.github.public_repos)}</b> repos ·{" "}
              <b className="text-foreground">{number.format(c.github.contributions_total)}</b> contributions
            </span>
          )}
        </p>
      </div>
    </article>
  );
}

export function ScoutCardBack({ c }: { c: DiscoverCandidate }) {
  return (
    <article className="flex h-full flex-col gap-4 overflow-y-auto rounded-[2rem] bg-surface p-6 [scrollbar-width:none] shadow-[0_30px_80px_-30px_rgb(20_10_50/0.65)]">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={avatarSrc(c.id, c.avatarPath)} alt="" className="size-14 rounded-full bg-accent-soft object-cover" />
        <div className="min-w-0">
          <p className="truncate text-xl font-bold tracking-tight">{c.name}</p>
          <p className="truncate text-sm text-muted">{c.college}</p>
        </div>
      </div>

      <section>
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted">About</h3>
        <p className="mt-1.5 text-[15px] leading-relaxed">{c.bio || "No bio yet."}</p>
      </section>

      {c.skills.length > 0 && (
        <section>
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted">Skills</h3>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {c.skills.map((s) => (
              <li key={s.id} className="rounded-full bg-chip px-3 py-1 text-xs font-medium">
                {s.name} · <span className="text-muted">{s.level}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {c.github && (
        <section className="grid grid-cols-3 gap-2 text-center">
          {[
            ["Repos", c.github.public_repos],
            ["Contributions", c.github.contributions_total],
            ["Followers", c.github.followers],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-surface-muted p-3">
              <p className="text-lg font-bold">{number.format(Number(value))}</p>
              <p className="text-[11px] text-muted">{label}</p>
            </div>
          ))}
          {c.github.top_language && (
            <p className="col-span-3 text-xs text-muted">
              Writes mostly <b className="text-foreground">{c.github.top_language}</b>
            </p>
          )}
        </section>
      )}

      <Link
        href={`/students/${c.id}`}
        target="_blank"
        className="mt-auto rounded-full bg-accent-soft px-4 py-2.5 text-center text-sm font-semibold text-accent-ink transition hover:bg-accent hover:text-accent-foreground"
      >
        Open full profile ↗
      </Link>
    </article>
  );
}
