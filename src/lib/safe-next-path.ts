/** Only allow redirects to paths on this site, never to another origin. */
export function safeNextPath(next: string | null | undefined, fallback = "/home") {
  // "//host" and "/\host" are protocol-relative URLs to another origin.
  return next && /^\/(?![/\\])/.test(next) ? next : fallback;
}
