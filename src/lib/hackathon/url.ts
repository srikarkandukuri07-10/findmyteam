/** A hackathon link as typed: "unstop.com/x" gets https://. Only plain http(s) pages with a real host are allowed. */
export function normalizeLinkUrl(raw: string): string | null {
  const text = raw.trim();
  if (!text || /\s/.test(text) || text.length > 2000) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.username || url.password) return null;
  // A real host name has a dot and is not a bare IP address.
  if (!url.hostname.includes(".") || /^[\d.]+$/.test(url.hostname) || url.hostname.includes(":")) return null;
  return url.href;
}

/** "unstop.com" for display. */
export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
