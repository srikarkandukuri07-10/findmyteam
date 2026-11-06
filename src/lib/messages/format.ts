/** Message formatting shared by the inbox and the chat (MSG-4). No React, so it is unit-tested. */

export type TextPart = { kind: "text"; text: string } | { kind: "link"; text: string; href: string };

const URL_RE = /\b((?:https?:\/\/|www\.)[^\s<>"']+[^\s<>"'.,;:!?)\]}])/gi;

/**
 * Splits a message into text and links. Only http(s) links become clickable; "www." gets https.
 * Anything else stays plain text, so a message can never carry a javascript: or data: link.
 */
export function linkify(body: string): TextPart[] {
  const parts: TextPart[] = [];
  let last = 0;
  for (const m of body.matchAll(URL_RE)) {
    const raw = m[0];
    const start = m.index ?? 0;
    if (start > last) parts.push({ kind: "text", text: body.slice(last, start) });
    const href = raw.toLowerCase().startsWith("www.") ? `https://${raw}` : raw;
    let safe = false;
    try {
      const u = new URL(href);
      safe = u.protocol === "https:" || u.protocol === "http:";
    } catch {
      safe = false;
    }
    parts.push(safe ? { kind: "link", text: raw, href } : { kind: "text", text: raw });
    last = start + raw.length;
  }
  if (last < body.length) parts.push({ kind: "text", text: body.slice(last) });
  return parts.length ? parts : [{ kind: "text", text: body }];
}

const IST = "Asia/Kolkata";

/** "14:05" for a message bubble, in India time. */
export function clockTime(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: IST }).format(
    new Date(iso),
  );
}

function dayKey(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: IST }).format(new Date(iso));
}

/** "Today", "Yesterday" or "Mon, 3 Nov" for the separator above a day's messages. */
export function dayLabel(iso: string, now: number = Date.now()): string {
  const day = dayKey(iso);
  if (day === dayKey(new Date(now).toISOString())) return "Today";
  if (day === dayKey(new Date(now - 86_400_000).toISOString())) return "Yesterday";
  return new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: IST }).format(
    new Date(iso),
  );
}

/** True when two messages fall on different days (India time), so a separator goes between them. */
export function isNewDay(prevIso: string | undefined, iso: string): boolean {
  return !prevIso || dayKey(prevIso) !== dayKey(iso);
}

/** Short time for the inbox: "14:05" today, "Yesterday", or "3 Nov". */
export function inboxTime(iso: string, now: number = Date.now()): string {
  const label = dayLabel(iso, now);
  if (label === "Today") return clockTime(iso);
  if (label === "Yesterday") return label;
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: IST }).format(new Date(iso));
}
