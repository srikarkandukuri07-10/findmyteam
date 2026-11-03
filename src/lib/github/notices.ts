/** Result of a GitHub connect/disconnect, passed back in the URL as ?github=<code>. */
export const GITHUB_NOTICES: Record<string, { ok: boolean; text: string }> = {
  connected: { ok: true, text: "GitHub connected. Your activity and projects now appear on your profile." },
  disconnected: { ok: true, text: "GitHub disconnected and its data removed from your profile." },
  denied: { ok: false, text: "GitHub wasn't authorized, so nothing was connected. You can try again any time." },
  failed: { ok: false, text: "We couldn't load your GitHub data. Please try again in a minute." },
  wait: { ok: false, text: "Please wait a minute before connecting again." },
  mismatch: { ok: false, text: "That GitHub account doesn't match the one you authorized. Please try again." },
  unavailable: { ok: false, text: "Connecting GitHub isn't available right now. Please try again later." },
};

export function githubNotice(code: string | string[] | undefined) {
  const key = Array.isArray(code) ? code[0] : code;
  return key ? (GITHUB_NOTICES[key] ?? null) : null;
}

/** Adds ?key=value to an internal path that may already have a query string. */
export function withParam(path: string, key: string, value: string) {
  const url = new URL(path, "http://internal.invalid");
  url.searchParams.set(key, value);
  return url.pathname + url.search;
}
