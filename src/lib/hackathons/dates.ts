/**
 * Date helpers for hackathons. Dates are calendar dates ("2026-12-11") with no time zone,
 * so everything here works in UTC to avoid off-by-one-day shifts.
 */

const MS_PER_DAY = 86_400_000;

export function parseIsoDate(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

/** True for a real calendar date written "YYYY-MM-DD". Never throws, whatever the input. */
export function isValidIsoDate(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const date = parseIsoDate(iso);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(iso);
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((parseIsoDate(toIso).getTime() - parseIsoDate(fromIso).getTime()) / MS_PER_DAY);
}

/** Today's calendar date in India, as "YYYY-MM-DD". Call only at request time. */
export function todayInIndia(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(now);
}

export type HackathonPhase = "upcoming" | "ongoing" | "ended";

export function hackathonPhase(startsOn: string, endsOn: string, today: string): HackathonPhase {
  if (today < startsOn) return "upcoming";
  if (today > endsOn) return "ended";
  return "ongoing";
}

/** Short countdown text for a chip: "Starts in 12 days", "Happening now", "Ended". */
export function phaseLabel(startsOn: string, endsOn: string, today: string): string {
  const phase = hackathonPhase(startsOn, endsOn, today);
  if (phase === "ongoing") return "Happening now";
  if (phase === "ended") return "Ended";
  const days = daysBetween(today, startsOn);
  if (days === 1) return "Starts tomorrow";
  return `Starts in ${days} days`;
}

const fmt = (iso: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", ...options }).format(parseIsoDate(iso));

/** "11 Dec 2026", "11–13 Dec 2026" or "30 Dec 2026 – 2 Jan 2027". */
export function formatDateRange(startsOn: string, endsOn: string): string {
  const full = { day: "numeric", month: "short", year: "numeric" } as const;
  if (startsOn === endsOn) return fmt(startsOn, full);
  const sameMonth = startsOn.slice(0, 7) === endsOn.slice(0, 7);
  if (sameMonth) {
    return `${fmt(startsOn, { day: "numeric" })}–${fmt(endsOn, full)}`;
  }
  return `${fmt(startsOn, startsOn.slice(0, 4) === endsOn.slice(0, 4) ? { day: "numeric", month: "short" } : full)} – ${fmt(endsOn, full)}`;
}

/** "11 Dec" for compact lists. */
export function formatShortDate(iso: string): string {
  return fmt(iso, { day: "numeric", month: "short" });
}

export const MODE_LABELS = {
  online: "Online",
  in_person: "In person",
  hybrid: "Hybrid",
} as const;
