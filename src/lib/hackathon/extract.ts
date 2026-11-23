import { hostOf } from "./url";

/** What we show about a hackathon. Everything is plain text read from the event page, and any of it can be missing. */
export type HackathonPreview = {
  url: string;
  host: string;
  name: string | null;
  /** One or two sentences. */
  summary: string | null;
  /** The longer description, as paragraphs. */
  about: string | null;
  startsOn: string | null;
  endsOn: string | null;
  /** Dates as written on the page, only when they could not be read as real dates. */
  datesText: string | null;
  mode: "online" | "offline" | "hybrid" | null;
  location: string | null;
  prizes: string | null;
  teamSize: string | null;
};

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const MONTH_RE = "(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)";
const MONEY_RE = String.raw`(?:₹|Rs\.?\s?|INR\s?|USD\s?|US\$|\$|€|£)\s?\d[\d,]*(?:\.\d+)?\s?(?:k|K|lakhs?|lacs?|L|million|M|crore|cr)?`;

/* ---------- plain-text helpers ---------- */

export function decodeEntities(s: string): string {
  const named: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", hellip: "…" };
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : m;
    }
    return named[e.toLowerCase()] ?? m;
  });
}

function oneLine(s: string): string {
  return decodeEntities(s).replace(/\s+/g, " ").trim();
}

/** Page text with scripts, styles and tags removed. */
export function visibleText(html: string): string {
  return oneLine(
    html
      .replace(/<(script|style|noscript|svg|template)\b[\s\S]*?<\/\1>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<[^>]+>/g, " "),
  );
}

/** Markdown or HTML description turned into plain paragraphs. */
export function plainParagraphs(raw: string, max = 1600): string {
  const text = decodeEntities(raw)
    .replace(/^\s*about( the)? (challenge|hackathon|event)\b[:\s-]*/i, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/(\*\*|__|\*|_|`)/g, "")
    .replace(/^\s*[-•*]\s+/gm, "• ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
  // Every line is its own paragraph; lines that are only a heading ("About the challenge") are dropped.
  const paragraphs = text
    .split(/\n+/)
    .map((p) => p.trim())
    .filter((p) => p && !/^(about( the)? (challenge|hackathon|event|us)|overview|description)\s*:?$/i.test(p));
  let out = "";
  for (const p of paragraphs) {
    if ((out + "\n\n" + p).length > max) {
      if (!out) out = p.slice(0, max).replace(/\s+\S*$/, "") + "…";
      break;
    }
    out = out ? `${out}\n\n${p}` : p;
  }
  return out;
}

/** The first paragraph that reads like a sentence (not a title or a date line). */
function proseSummary(paragraphs: string, max = 260): string {
  const lines = paragraphs.split(/\n{2,}/);
  const sentence = lines.find((l) => l.length >= 60 && l.split(/\s+/).length >= 9) ?? lines.find((l) => l.length >= 25) ?? lines[0] ?? "";
  return firstSentences(sentence, max);
}

function firstSentences(text: string, max = 260): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  const stop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  return stop > 80 ? cut.slice(0, stop + 1) : cut.replace(/\s+\S*$/, "") + "…";
}

/* ---------- reading the page's own data ---------- */

function parseMeta(html: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const attrs = new Map<string, string>();
    for (const m of tag.matchAll(/([a-zA-Z:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) attrs.set(m[1].toLowerCase(), m[2] ?? m[3] ?? "");
    const key = (attrs.get("property") ?? attrs.get("name") ?? attrs.get("itemprop") ?? "").toLowerCase();
    const content = attrs.get("content");
    if (key && content && !map.has(key)) map.set(key, oneLine(content));
  }
  return map;
}

function jsonLdBlocks(html: string): unknown[] {
  const out: unknown[] = [];
  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      out.push(JSON.parse(m[1]));
    } catch {
      /* a broken block is skipped */
    }
  }
  return out;
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

function flattenLd(node: unknown, out: Obj[] = []): Obj[] {
  if (Array.isArray(node)) node.forEach((n) => flattenLd(n, out));
  else if (isObj(node)) {
    out.push(node);
    if (node["@graph"]) flattenLd(node["@graph"], out);
  }
  return out;
}

function typeIncludes(node: Obj, name: string): boolean {
  const t = node["@type"];
  return (Array.isArray(t) ? t : [t]).some((x) => typeof x === "string" && x.toLowerCase().includes(name));
}

function ldPlace(loc: unknown, eventName: string | null = null): string | null {
  if (Array.isArray(loc)) return loc.map((l) => ldPlace(l, eventName)).filter(Boolean).join(", ") || null;
  if (!isObj(loc)) return str(loc);
  const addr = loc.address;
  const addrText = isObj(addr)
    ? [addr.streetAddress, addr.addressLocality, addr.addressRegion, addr.addressCountry].map(str).filter(Boolean).join(", ")
    : str(addr);
  const name = str(loc.name);
  // Skip the event's own name, and any part that repeats.
  const parts = [name && name !== eventName ? name : null, addrText].filter((x): x is string => Boolean(x)).join(", ").split(/,\s*/);
  const seen = new Set<string>();
  return parts.filter((x) => !seen.has(x.toLowerCase()) && seen.add(x.toLowerCase())).join(", ") || null;
}

type Partial_ = Partial<Omit<HackathonPreview, "url" | "host">>;

function fromJsonLd(html: string): Partial_ {
  const event = jsonLdBlocks(html).flatMap((b) => flattenLd(b)).find((n) => typeIncludes(n, "event"));
  if (!event) return {};
  const attendance = str(event.eventAttendanceMode)?.toLowerCase() ?? "";
  const place = ldPlace(event.location, str(event.name));
  const virtual = isObj(event.location) && typeIncludes(event.location, "virtual");
  return {
    name: str(event.name),
    about: str(event.description) ? plainParagraphs(str(event.description) as string) : null,
    startsOn: dateOnly(str(event.startDate)),
    endsOn: dateOnly(str(event.endDate)),
    location: virtual ? null : place,
    mode: attendance.includes("mixed") ? "hybrid" : attendance.includes("online") || virtual ? "online" : attendance.includes("offline") ? "offline" : null,
  };
}

/** Devfolio pages are Next.js apps that embed the event as JSON. */
function fromNextData(html: string): Partial_ {
  const raw = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)?.[1];
  if (!raw) return {};
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return {};
  }
  const pageProps = isObj(data) && isObj(data.props) && isObj(data.props.pageProps) ? data.props.pageProps : null;
  const h = pageProps && isObj(pageProps.hackathon) ? pageProps.hackathon : null;
  if (!h) return {};
  const min = typeof h.team_min === "number" ? h.team_min : null;
  const max = typeof h.team_max === "number" ? h.team_max : null;
  const online = h.is_online === true;
  const place = str(h.location) ?? ([str(h.city), str(h.country)].filter(Boolean).join(", ") || null);
  const prizeValue = pageProps && typeof pageProps.aggregatePrizeValue === "number" ? pageProps.aggregatePrizeValue : 0;
  const currency = pageProps ? str(pageProps.aggregatePrizeCurrency) : null;
  return {
    name: str(h.name),
    about: str(h.desc) ? plainParagraphs(str(h.desc) as string) : str(h.tagline),
    startsOn: dateOnly(str(h.starts_at)),
    endsOn: dateOnly(str(h.ends_at)),
    mode: online ? "online" : h.is_online === false ? "offline" : null,
    location: online ? null : place,
    teamSize: min && max ? (min === max ? `${min}` : `${min}–${max}`) : null,
    prizes: prizeValue > 0 ? `${currency === "INR" ? "₹" : currency === "USD" ? "$" : (currency ?? "") + " "}${prizeValue.toLocaleString("en-IN")} in prizes`.trim() : null,
  };
}

function dateOnly(v: string | null): string | null {
  const m = v?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

/* ---------- reading what the page says in words ---------- */

function iso(year: number, month: number, day: number): string | null {
  if (month < 0 || month > 11 || day < 1 || day > 31) return null;
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const monthIndex = (name: string) => MONTHS.indexOf(name.slice(0, 3).toLowerCase());

/** Without a year on the page, assume the next time that date comes round. */
function inferYear(month: number, day: number, now: Date): number {
  const y = now.getUTCFullYear();
  const candidate = Date.UTC(y, month, day);
  return candidate < now.getTime() - 45 * 86_400_000 ? y + 1 : y;
}

export function findDates(text: string, now: Date = new Date()): { startsOn: string | null; endsOn: string | null } {
  const patterns: { re: RegExp; read: (m: RegExpMatchArray) => { sm: string; sd: string; em?: string; ed?: string; y?: string } }[] = [
    // Oct 24, 2026 · Dec 12 – Dec 13 · Nov 28-29, 2026
    {
      re: new RegExp(`\\b${MONTH_RE}\\.?\\s+(\\d{1,2})(?!\\d)(?:st|nd|rd|th)?(?:\\s*(?:[-–—]|to)\\s*(?:${MONTH_RE}\\.?\\s+)?(\\d{1,2})(?!\\d)(?:st|nd|rd|th)?)?(?:,?\\s*(20\\d\\d))?`, "i"),
      read: (m) => ({ sm: m[1], sd: m[2], em: m[3], ed: m[4], y: m[5] }),
    },
    // 24 Oct 2026 · 28-29 November · 3rd–4th January 2027
    {
      re: new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?(?:\\s*(?:[-–—]|to)\\s*(\\d{1,2})(?:st|nd|rd|th)?)?\\s+(?:of\\s+)?${MONTH_RE}\\b\\.?(?:,?\\s*(20\\d\\d))?`, "i"),
      read: (m) => ({ sm: m[3], sd: m[1], ed: m[2], y: m[4] }),
    },
  ];
  const keyword = /(?:dates?|when|schedule|starts?|begins?|event date|hackathon dates?|on)\b/gi;
  const windows: string[] = [];
  for (const k of text.slice(0, 40_000).matchAll(keyword)) windows.push(text.slice(k.index ?? 0, (k.index ?? 0) + 160));
  windows.push(text.slice(0, 20_000));

  for (const area of windows) {
    for (const { re, read } of patterns) {
      const m = area.match(re);
      if (!m) continue;
      const { sm, sd, em, ed, y } = read(m);
      const month = monthIndex(sm);
      const day = parseInt(sd, 10);
      if (month < 0) continue;
      const year = y ? parseInt(y, 10) : inferYear(month, day, now);
      const startsOn = iso(year, month, day);
      if (!startsOn) continue;
      let endsOn: string | null = null;
      if (ed) {
        const endMonth = em ? monthIndex(em) : month;
        const endYear = endMonth < month ? year + 1 : year;
        endsOn = iso(endYear, endMonth, parseInt(ed, 10));
      }
      return { startsOn, endsOn };
    }
  }
  return { startsOn: null, endsOn: null };
}

export function findPrizes(text: string): string | null {
  const tidy = (s: string) => s.replace(/\s+/g, " ").replace(/([₹$€£])\s+(\d)/, "$1$2").trim();
  const candidates: RegExp[] = [
    new RegExp(`(${MONEY_RE})\\s*(?:in|worth of|of)?\\s*(?:total\\s*)?(?:cash\\s*)?(?:prizes?|prize money|rewards?)`, "i"),
    new RegExp(`prize\\s*pool(?:\\s*of|\\s*[:\\-–])?\\s*(${MONEY_RE})`, "i"),
    new RegExp(`(?:prizes?|rewards?)\\s*(?:worth|of|total(?:ling)?|[:\\-–])\\s*(${MONEY_RE})`, "i"),
    new RegExp(`(?:win|winning)\\s*(?:up to\\s*)?(${MONEY_RE})`, "i"),
  ];
  for (const re of candidates) {
    const m = text.match(re);
    if (m) return `${tidy(m[1])} in prizes`;
  }
  const plain = text.match(/\bprizes?\s*[:\-–]\s*(.{3,90}?)(?=\s(?:Team size|Participation|Registration|Dates?|Venue|Location|Time|Fee|Eligibility|Deadline)\b|[.|]|$)/i);
  if (plain) return tidy(plain[1]).replace(/[,;]\s*$/, "");
  return null;
}

function findMode(...parts: (string | null)[]): HackathonPreview["mode"] {
  const text = parts.filter(Boolean).join(" ").toLowerCase();
  if (/\bhybrid\b/.test(text)) return "hybrid";
  const online = /\b(online|virtual|remote)\b/.test(text);
  const offline = /\b(in[- ]person|offline|on[- ]site|onsite|on[- ]campus)\b/.test(text);
  if (online && !offline) return "online";
  if (offline && !online) return "offline";
  return null;
}

function findTeamSize(text: string): string | null {
  const m = text.match(/team\s*size\s*[:\-–]?\s*(\d+\s*(?:[-–—]|to)\s*\d+|\d+)/i) ?? text.match(/teams?\s*of\s*(\d+\s*(?:[-–—]|to)\s*\d+)/i);
  return m ? m[1].replace(/\s*(?:-|—|to)\s*/i, "–").replace(/\s+/g, "") : null;
}

function findLocation(text: string): string | null {
  const m = text.match(/(?:venue|location)\s*[:\-–]\s*([^|\n]{3,90}?)(?=\s{2,}|\s(?:Date|Dates|Time|Prizes?|Team|Participation|Registration)\b|[.|]|$)/i);
  return m ? m[1].trim() : null;
}

function cleanTitle(raw: string | null, siteName: string | null): string | null {
  if (!raw) return null;
  const parts = raw.split(/\s+[|·–—]\s+|\s+-\s+/);
  if (parts.length > 1) {
    const rest = parts.slice(1).join(" ").trim();
    const site = siteName?.toLowerCase();
    if (rest.length <= 28 || (site && rest.toLowerCase().includes(site))) return parts[0].trim() || raw;
  }
  return raw.trim();
}

/** Reads what a hackathon page says about itself. Best effort: any field can come back empty. */
export function extractHackathon(html: string, url: string, now: Date = new Date()): HackathonPreview {
  const meta = parseMeta(html);
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const siteName = meta.get("og:site_name") ?? null;
  const ld = fromJsonLd(html);
  const next = fromNextData(html);
  const text = visibleText(html).slice(0, 80_000);

  const metaDescription = meta.get("og:description") ?? meta.get("description") ?? meta.get("twitter:description") ?? null;
  const name = cleanTitle(next.name ?? ld.name ?? meta.get("og:title") ?? meta.get("twitter:title") ?? (title ? oneLine(title) : null), siteName);

  // The page's structured description keeps its paragraphs; the meta tag is flattened to one line.
  const structuredAbout = next.about ?? ld.about ?? null;
  const rawAbout = structuredAbout ?? (metaDescription ? plainParagraphs(metaDescription) : null);
  // A long meta description is the summary; a short one is a tagline that leads the first real sentence.
  const tagline = metaDescription && metaDescription.length < 60 ? metaDescription.replace(/[.!\s]+$/, "") : null;
  const lead = structuredAbout
    ? proseSummary(structuredAbout)
    : metaDescription && metaDescription.length >= 60
      ? firstSentences(plainParagraphs(metaDescription))
      : null;
  const summary = tagline && lead && !lead.toLowerCase().startsWith(tagline.toLowerCase()) ? firstSentences(`${tagline}. ${lead}`) : (lead ?? tagline);

  const dates = next.startsOn || ld.startsOn ? { startsOn: next.startsOn ?? ld.startsOn ?? null, endsOn: next.endsOn ?? ld.endsOn ?? null } : findDates(text, now);
  const mode = next.mode ?? ld.mode ?? findMode(name, summary, rawAbout);
  const prizes = next.prizes ?? findPrizes(rawAbout ?? "") ?? findPrizes(text);

  return {
    url,
    host: hostOf(url),
    name: name || null,
    summary: summary || null,
    about: rawAbout && rawAbout !== summary ? rawAbout : null,
    startsOn: dates.startsOn,
    endsOn: dates.endsOn,
    datesText: null,
    mode,
    location: next.location ?? ld.location ?? (mode === "online" ? null : findLocation(text)),
    prizes,
    teamSize: next.teamSize ?? findTeamSize(text),
  };
}

/** True when the page gave us enough to show a useful summary. */
export function isUseful(p: HackathonPreview): boolean {
  return Boolean(p.name || p.summary || p.about);
}
