import { describe, expect, it } from "vitest";
import { timeAgo } from "./time";

const NOW = Date.parse("2026-11-03T12:00:00Z");
const ago = (seconds: number) => new Date(NOW - seconds * 1000).toISOString();

describe("timeAgo", () => {
  it("says just now for the last moments, and for a clock that is slightly ahead", () => {
    expect(timeAgo(ago(5), NOW)).toBe("just now");
    expect(timeAgo(ago(-30), NOW)).toBe("just now");
  });

  it("counts minutes, hours, days, weeks and months", () => {
    expect(timeAgo(ago(60), NOW)).toBe("1 minute ago");
    expect(timeAgo(ago(5 * 60), NOW)).toBe("5 minutes ago");
    expect(timeAgo(ago(3 * 3600), NOW)).toBe("3 hours ago");
    expect(timeAgo(ago(86400), NOW)).toBe("1 day ago");
    expect(timeAgo(ago(6 * 86400), NOW)).toBe("6 days ago");
    expect(timeAgo(ago(14 * 86400), NOW)).toBe("2 weeks ago");
    expect(timeAgo(ago(90 * 86400), NOW)).toBe("3 months ago");
  });

  it("returns nothing for an invalid date instead of throwing", () => {
    expect(timeAgo("not a date", NOW)).toBe("");
    expect(timeAgo("", NOW)).toBe("");
  });
});
