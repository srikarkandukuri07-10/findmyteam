import { describe, expect, it } from "vitest";
import { formatDateRange } from "@/lib/hackathon/format";
import { timeAgo } from "./format";

describe("timeAgo (D33)", () => {
  const now = Date.parse("2026-11-23T12:00:00Z");
  it("counts up from just now to days", () => {
    expect(timeAgo("2026-11-23T11:59:40Z", now)).toBe("just now");
    expect(timeAgo("2026-11-23T11:55:00Z", now)).toBe("5m");
    expect(timeAgo("2026-11-23T09:00:00Z", now)).toBe("3h");
    expect(timeAgo("2026-11-21T12:00:00Z", now)).toBe("2d");
    expect(timeAgo("2026-11-01T12:00:00Z", now)).toBe("1 Nov");
  });
});

describe("formatDateRange (D33)", () => {
  it("writes one day, a range in a month, and ranges across months and years", () => {
    expect(formatDateRange("2026-10-24", "2026-10-24")).toBe("Oct 24, 2026");
    expect(formatDateRange("2026-12-12", "2026-12-13")).toBe("Dec 12 – 13, 2026");
    expect(formatDateRange("2026-11-28", "2026-12-02")).toBe("Nov 28 – Dec 2, 2026");
    expect(formatDateRange("2026-12-28", "2027-01-02")).toBe("Dec 28, 2026 – Jan 2, 2027");
    expect(formatDateRange(null, null)).toBeNull();
  });
});
