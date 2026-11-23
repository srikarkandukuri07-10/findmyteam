import { describe, expect, it } from "vitest";
import { isPublicIp } from "./ip";
import { hostOf, normalizeLinkUrl } from "./url";

describe("normalizeLinkUrl (D33)", () => {
  it("adds https:// when it was left out", () => {
    expect(normalizeLinkUrl("unstop.com/hackathons/x")).toBe("https://unstop.com/hackathons/x");
    expect(normalizeLinkUrl("  https://devpost.com/x  ")).toBe("https://devpost.com/x");
  });
  it("refuses anything that isn't a plain web page", () => {
    for (const bad of ["javascript:alert(1)", "file:///etc/passwd", "ftp://x.com/a", "not a link", "", "http://localhost/x",
      "http://127.0.0.1/x", "http://[::1]/x", "https://user:pw@example.com/x", "http://10.0.0.5/x", "data:text/html,hi"]) {
      expect(normalizeLinkUrl(bad), bad).toBeNull();
    }
  });
  it("shows the site name without www", () => {
    expect(hostOf("https://www.devfolio.co/x")).toBe("devfolio.co");
  });
});

describe("isPublicIp (D33)", () => {
  it("allows public addresses", () => {
    for (const ip of ["8.8.8.8", "76.76.21.21", "104.21.38.50", "2606:4700::1111"]) expect(isPublicIp(ip), ip).toBe(true);
  });
  it("blocks private, loopback, metadata and reserved addresses", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254", "0.0.0.0",
      "100.64.0.1", "224.0.0.1", "255.255.255.255", "::1", "::", "fc00::1", "fd12:3456::1", "fe80::1", "::ffff:127.0.0.1",
      "::ffff:10.0.0.1", "not-an-ip"]) {
      expect(isPublicIp(ip), ip).toBe(false);
    }
  });
});
