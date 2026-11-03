import { buildHeatmap, type HeatLevel } from "@/lib/github/heatmap";
import { githubProfileUrl, isGithubUrl, type GithubSnapshot } from "@/lib/github/snapshot";
import { Chip } from "./ui";

// 53 weeks at this size is 634px wide, which fits the profile card on desktop without scrolling.
const CELL = 10;
const GAP = 2;
const STEP = CELL + GAP;
const LABEL_HEIGHT = 16;

const LEVEL_FILL: Record<HeatLevel, string> = {
  0: "fill-chip",
  1: "fill-accent/25",
  2: "fill-accent/50",
  3: "fill-accent/75",
  4: "fill-accent",
};

const number = new Intl.NumberFormat("en-IN");

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-surface-muted px-4 py-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 text-2xl font-semibold tracking-tight text-accent-strong">{number.format(value)}</dd>
    </div>
  );
}

/** Contribution calendar as an SVG, newest week on the right, scrolled to the newest on small screens. */
function ContributionGraph({ github }: { github: GithubSnapshot }) {
  const { weeks, months } = buildHeatmap(github.calendar);
  if (weeks.length === 0) return null;

  const width = weeks.length * STEP - GAP;
  const height = LABEL_HEIGHT + 7 * STEP - GAP;

  return (
    <div className="space-y-2">
      {/* rtl on the scroller starts it at the right edge; the content is flipped back to ltr. */}
      <div className="overflow-x-auto pb-1 [direction:rtl]">
        <svg
          role="img"
          aria-label={`${number.format(github.contributions_total)} contributions in the last year`}
          viewBox={`0 0 ${width} ${height}`}
          width={width}
          height={height}
          className="[direction:ltr]"
        >
          {months.map((m) => (
            <text key={m.week} x={m.week * STEP} y={10} className="fill-muted text-[10px]">
              {m.label}
            </text>
          ))}
          {weeks.map((week, w) =>
            week.map(
              (cell, d) =>
                cell && (
                  <rect
                    key={cell.date}
                    x={w * STEP}
                    y={LABEL_HEIGHT + d * STEP}
                    width={CELL}
                    height={CELL}
                    rx={2}
                    className={LEVEL_FILL[cell.level]}
                  >
                    <title>{`${cell.count} contribution${cell.count === 1 ? "" : "s"} on ${cell.date}`}</title>
                  </rect>
                ),
            ),
          )}
        </svg>
      </div>
      <div className="flex items-center justify-end gap-1.5 text-xs text-muted" aria-hidden>
        Less
        {([0, 1, 2, 3, 4] as HeatLevel[]).map((l) => (
          <svg key={l} width={CELL} height={CELL}>
            <rect width={CELL} height={CELL} rx={2} className={LEVEL_FILL[l]} />
          </svg>
        ))}
        More
      </div>
    </div>
  );
}

/** A connected student's GitHub activity: counts, contribution graph, languages and top repositories. */
export function GithubSection({ github, verified }: { github: GithubSnapshot; verified: boolean }) {
  return (
    <section className="space-y-5 border-t border-border pt-6" aria-labelledby="github-heading">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 id="github-heading" className="text-lg font-semibold tracking-tight">
          GitHub
        </h2>
        {verified && <Chip tone="success">✓ Verified with GitHub</Chip>}
        <a
          href={githubProfileUrl(github.login)}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="text-sm font-medium text-accent underline-offset-2 hover:underline"
        >
          @{github.login} ↗
        </a>
      </div>

      <dl className="grid grid-cols-3 gap-3">
        <Stat label="Repositories" value={github.public_repos} />
        <Stat label="Contributions, past year" value={github.contributions_total} />
        <Stat label="Followers" value={github.followers} />
      </dl>

      <ContributionGraph github={github} />

      {github.languages.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted">Languages</h3>
          <ul className="flex flex-wrap gap-2">
            {github.languages.map((l) => (
              <li key={l.name}>
                <Chip>
                  {l.name} · {l.repos}
                </Chip>
              </li>
            ))}
          </ul>
        </div>
      )}

      {github.top_repos.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted">Top projects</h3>
          <ul className="grid gap-3 sm:grid-cols-2">
            {github.top_repos.map((repo) => (
              <li key={repo.url} className="flex flex-col gap-2 rounded-2xl bg-surface-muted p-4">
                {isGithubUrl(repo.url) ? (
                  <a
                    href={repo.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="break-words font-semibold text-accent underline-offset-2 hover:underline"
                  >
                    {repo.name}
                  </a>
                ) : (
                  <span className="break-words font-semibold">{repo.name}</span>
                )}
                {repo.description && <p className="line-clamp-2 break-words text-sm text-muted">{repo.description}</p>}
                <p className="mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs text-muted">
                  {repo.language && <span>{repo.language}</span>}
                  <span>★ {number.format(repo.stars)}</span>
                  <span>⑂ {number.format(repo.forks)}</span>
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
