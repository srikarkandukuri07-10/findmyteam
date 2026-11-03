const UNITS: [limit: number, divisor: number, name: string][] = [
  [60, 1, "second"],
  [3600, 60, "minute"],
  [86400, 3600, "hour"],
  [604800, 86400, "day"],
  [2629800, 604800, "week"],
  [Infinity, 2629800, "month"],
];

/** "just now", "5 minutes ago", "3 days ago". Pass `now` in tests. */
export function timeAgo(iso: string, now: number = Date.now()): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "";
  const seconds = Math.max(0, Math.round((now - then) / 1000));
  if (seconds < 45) return "just now";
  for (const [limit, divisor, name] of UNITS) {
    if (seconds < limit) {
      const value = Math.max(1, Math.round(seconds / divisor));
      return `${value} ${name}${value === 1 ? "" : "s"} ago`;
    }
  }
  return "";
}
