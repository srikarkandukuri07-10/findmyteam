import net from "node:net";

function v4Parts(ip: string): number[] {
  return ip.split(".").map(Number);
}

/**
 * True only for addresses on the public internet. Anything private, loopback, link-local (cloud metadata),
 * shared, reserved or multicast is refused, so a link can never make our server read an internal service.
 */
export function isPublicIp(ip: string): boolean {
  const kind = net.isIP(ip);
  if (kind === 4) {
    const [a, b, c] = v4Parts(ip);
    if (a === 0 || a === 10 || a === 127) return false;
    if (a === 100 && b >= 64 && b <= 127) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 0 && (c === 0 || c === 2)) return false;
    if (a === 192 && b === 168) return false;
    if (a === 198 && (b === 18 || b === 19)) return false;
    if (a === 198 && b === 51 && c === 100) return false;
    if (a === 203 && b === 0 && c === 113) return false;
    if (a >= 224) return false;
    return true;
  }
  if (kind === 6) {
    const lower = ip.toLowerCase();
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPublicIp(mapped[1]);
    if (lower === "::" || lower === "::1") return false;
    if (/^f[cd]/.test(lower)) return false; // fc00::/7 unique local
    if (/^fe[89ab]/.test(lower)) return false; // fe80::/10 link-local
    if (lower.startsWith("ff")) return false; // multicast
    if (lower.startsWith("2001:db8")) return false; // documentation
    return true;
  }
  return false;
}
