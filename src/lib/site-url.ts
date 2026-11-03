import "server-only";
import { headers } from "next/headers";

export { safeNextPath } from "./safe-next-path";

/** Absolute origin of the current request, for links in auth emails. */
export async function siteUrl() {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
