import { dayLabel } from "@/lib/messages/format";

const IST = "Asia/Kolkata";

/** "today", "yesterday" or "on 12 Nov", for "created …" and "joined …" lines. */
export function sinceLabel(iso: string, now: number = Date.now()): string {
  const label = dayLabel(iso, now);
  if (label === "Today") return "today";
  if (label === "Yesterday") return "yesterday";
  return `on ${new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: IST }).format(new Date(iso))}`;
}
