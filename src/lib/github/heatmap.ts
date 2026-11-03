export type HeatLevel = 0 | 1 | 2 | 3 | 4;
export type HeatCell = { date: string; count: number; level: HeatLevel };

const LEVELS: Record<string, HeatLevel> = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4,
};

const DAY_MS = 86_400_000;

function addDays(iso: string, days: number) {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + days * DAY_MS);
}

/**
 * Lays one entry per day out as GitHub does: columns are weeks (Sunday first), rows are weekdays.
 * The first column is padded with empty cells when the range starts mid-week.
 * Month labels sit on the first week of each month, skipping ones too close to fit.
 */
export function buildHeatmap(calendar: { start: string; counts: number[]; levels: string[] }) {
  // Stored data is trusted, but one bad row must never take the profile page down.
  if (Number.isNaN(Date.parse(`${calendar.start}T00:00:00Z`))) return { weeks: [], months: [] };

  const days = Math.min(calendar.counts.length, calendar.levels.length);
  const startOffset = addDays(calendar.start, 0).getUTCDay();

  const cells: (HeatCell | null)[] = Array.from({ length: startOffset }, () => null);
  for (let i = 0; i < days; i++) {
    cells.push({
      date: addDays(calendar.start, i).toISOString().slice(0, 10),
      count: calendar.counts[i],
      level: LEVELS[calendar.levels[i]] ?? 0,
    });
  }

  const weeks: (HeatCell | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const months: { week: number; label: string }[] = [];
  let lastMonth = "";
  let lastLabelWeek = -10;
  weeks.forEach((week, index) => {
    const first = week.find((c) => c !== null);
    if (!first) return;
    const month = first.date.slice(0, 7);
    if (month === lastMonth) return;
    lastMonth = month;
    if (index - lastLabelWeek < 3) return; // would overlap the previous label
    lastLabelWeek = index;
    months.push({
      week: index,
      label: new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" }).format(addDays(first.date, 0)),
    });
  });

  return { weeks, months };
}
