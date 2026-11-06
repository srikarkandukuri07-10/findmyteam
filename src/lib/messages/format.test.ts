import { describe, expect, it } from "vitest";
import { clockTime, dayLabel, inboxTime, isNewDay, linkify } from "./format";

describe("linkify (MSG-4)", () => {
  it("leaves plain text alone", () => {
    expect(linkify("hello there")).toEqual([{ kind: "text", text: "hello there" }]);
  });

  it("turns http(s) links into links and keeps the text around them", () => {
    expect(linkify("see https://github.com/fmt/repo now")).toEqual([
      { kind: "text", text: "see " },
      { kind: "link", text: "https://github.com/fmt/repo", href: "https://github.com/fmt/repo" },
      { kind: "text", text: " now" },
    ]);
  });

  it("adds https to www. links and drops trailing punctuation", () => {
    expect(linkify("go to www.devfolio.co.")).toEqual([
      { kind: "text", text: "go to " },
      { kind: "link", text: "www.devfolio.co", href: "https://www.devfolio.co" },
      { kind: "text", text: "." },
    ]);
  });

  it("never makes javascript: or data: links", () => {
    const parts = linkify("javascript:alert(1) data:text/html,hi");
    expect(parts.every((p) => p.kind === "text")).toBe(true);
  });

  it("finds several links", () => {
    const links = linkify("a https://a.dev b http://b.dev").filter((p) => p.kind === "link");
    expect(links).toHaveLength(2);
  });
});

describe("times (India time)", () => {
  const now = Date.parse("2026-11-06T10:00:00Z"); // 15:30 in India

  it("formats a clock time", () => {
    expect(clockTime("2026-11-06T08:35:00Z")).toBe("14:05");
  });

  it("labels today, yesterday and older days", () => {
    expect(dayLabel("2026-11-06T02:00:00Z", now)).toBe("Today");
    expect(dayLabel("2026-11-05T10:00:00Z", now)).toBe("Yesterday");
    expect(dayLabel("2026-11-01T10:00:00Z", now)).toMatch(/1 Nov/);
  });

  it("uses India's date, not UTC's, for the day boundary", () => {
    // 19:00 UTC on 5 Nov is 00:30 on 6 Nov in India.
    expect(dayLabel("2026-11-05T19:00:00Z", now)).toBe("Today");
  });

  it("detects a new day between two messages", () => {
    expect(isNewDay(undefined, "2026-11-06T02:00:00Z")).toBe(true);
    expect(isNewDay("2026-11-06T02:00:00Z", "2026-11-06T09:00:00Z")).toBe(false);
    expect(isNewDay("2026-11-05T10:00:00Z", "2026-11-06T09:00:00Z")).toBe(true);
  });

  it("shows short inbox times", () => {
    expect(inboxTime("2026-11-06T08:35:00Z", now)).toBe("14:05");
    expect(inboxTime("2026-11-05T10:00:00Z", now)).toBe("Yesterday");
    expect(inboxTime("2026-10-20T10:00:00Z", now)).toMatch(/20 Oct/);
  });
});
