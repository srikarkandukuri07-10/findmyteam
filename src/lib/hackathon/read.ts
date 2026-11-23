import "server-only";
import { extractHackathon, isUseful, type HackathonPreview } from "./extract";
import { fetchPublicHtml } from "./fetch";
import { normalizeLinkUrl } from "./url";

/** Reads a hackathon page and summarises it. Returns null when the page can't be read or says nothing useful. */
export async function readHackathon(rawUrl: string): Promise<HackathonPreview | null> {
  const url = normalizeLinkUrl(rawUrl);
  if (!url) return null;
  const page = await fetchPublicHtml(url);
  if (!page.ok) return null;
  const preview = extractHackathon(page.html, url);
  return isUseful(preview) ? preview : null;
}
