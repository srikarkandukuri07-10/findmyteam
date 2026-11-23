import "server-only";
import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import { isPublicIp } from "./ip";

const MAX_BYTES = 1_500_000;
const TIMEOUT_MS = 7_000;
const MAX_REDIRECTS = 3;
const USER_AGENT = "Mozilla/5.0 (compatible; FindMyTeamBot/1.0; +https://findmyteam.tech)";

export type FetchResult = { ok: true; html: string; finalUrl: string } | { ok: false; reason: "blocked" | "unreachable" | "not_html" | "timeout" };

/**
 * Looks the host name up ourselves and refuses internal addresses. The connection is made to the address
 * that passed the check, so a name that later points somewhere else can't sneak in (DNS rebinding).
 */
function safeLookup(
  hostname: string,
  options: dns.LookupOptions,
  callback: (err: NodeJS.ErrnoException | null, address: string | dns.LookupAddress[], family?: number) => void,
): void {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, "", 4);
    const list = addresses as dns.LookupAddress[];
    if (list.length === 0 || list.some((a) => !isPublicIp(a.address))) {
      return callback(Object.assign(new Error("blocked_address"), { code: "EBLOCKED" }), "", 4);
    }
    if (options.all) return callback(null, list);
    callback(null, list[0].address, list[0].family);
  });
}

function checkTarget(url: URL): boolean {
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  if (url.username || url.password) return false;
  if (url.port && url.port !== "80" && url.port !== "443") return false;
  // A bare IP in the link never goes through the lookup above, so it is checked here.
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (net.isIP(host) && !isPublicIp(host)) return false;
  return true;
}

function getOnce(url: URL): Promise<{ status: number; location: string | null; type: string; body: Buffer }> {
  return new Promise((resolve, reject) => {
    const lib = url.protocol === "https:" ? https : http;
    const req = lib.request(
      url,
      {
        method: "GET",
        timeout: TIMEOUT_MS,
        lookup: safeLookup as net.LookupFunction,
        // Accept */*: some sites' firewalls refuse a bot that asks for text/html. The reply type is checked below.
        headers: { "User-Agent": USER_AGENT, Accept: "*/*", "Accept-Encoding": "identity", "Accept-Language": "en" },
      },
      (res) => {
        const chunks: Buffer[] = [];
        let size = 0;
        res.on("data", (chunk: Buffer) => {
          size += chunk.length;
          chunks.push(chunk);
          if (size > MAX_BYTES) res.destroy(); // enough: the details sit near the top of the page
        });
        const done = () =>
          resolve({
            status: res.statusCode ?? 0,
            location: typeof res.headers.location === "string" ? res.headers.location : null,
            type: String(res.headers["content-type"] ?? ""),
            body: Buffer.concat(chunks).subarray(0, MAX_BYTES),
          });
        res.on("end", done);
        res.on("close", done);
        res.on("error", done);
      },
    );
    req.on("timeout", () => req.destroy(Object.assign(new Error("timeout"), { code: "ETIMEOUT" })));
    req.on("error", reject);
    req.end();
  });
}

/** Fetches a public web page as text. Follows a few redirects, re-checking each one. */
export async function fetchPublicHtml(start: string): Promise<FetchResult> {
  let url: URL;
  try {
    url = new URL(start);
  } catch {
    return { ok: false, reason: "blocked" };
  }
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (!checkTarget(url)) return { ok: false, reason: "blocked" };
    let res;
    try {
      res = await getOnce(url);
    } catch (e) {
      const code = (e as NodeJS.ErrnoException).code;
      if (code === "EBLOCKED") return { ok: false, reason: "blocked" };
      if (code === "ETIMEOUT") return { ok: false, reason: "timeout" };
      return { ok: false, reason: "unreachable" };
    }
    if (res.status >= 300 && res.status < 400 && res.location) {
      try {
        url = new URL(res.location, url);
      } catch {
        return { ok: false, reason: "unreachable" };
      }
      continue;
    }
    if (res.status < 200 || res.status >= 300) return { ok: false, reason: "unreachable" };
    if (!/text\/html|application\/xhtml/i.test(res.type)) return { ok: false, reason: "not_html" };
    return { ok: true, html: new TextDecoder("utf-8").decode(res.body), finalUrl: url.href };
  }
  return { ok: false, reason: "unreachable" };
}
