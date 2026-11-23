const MONTH = new Intl.DateTimeFormat("en-IN", { month: "short", timeZone: "UTC" });

function parts(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`);
  return { d, day: d.getUTCDate(), month: MONTH.format(d), year: d.getUTCFullYear() };
}

/** "Dec 12 – 13, 2026", "Dec 28, 2026 – Jan 2, 2027" or "Oct 24, 2026". Dates are plain days, with no time zone shifts. */
export function formatDateRange(startsOn: string | null, endsOn: string | null): string | null {
  if (!startsOn) return null;
  const s = parts(startsOn);
  if (!endsOn || endsOn === startsOn) return `${s.month} ${s.day}, ${s.year}`;
  const e = parts(endsOn);
  if (s.year !== e.year) return `${s.month} ${s.day}, ${s.year} – ${e.month} ${e.day}, ${e.year}`;
  if (s.month !== e.month) return `${s.month} ${s.day} – ${e.month} ${e.day}, ${e.year}`;
  return `${s.month} ${s.day} – ${e.day}, ${e.year}`;
}

export const MODE_LABEL = { online: "Online", offline: "Offline (in person)", hybrid: "Hybrid" } as const;
