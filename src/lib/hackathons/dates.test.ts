import { describe, expect, it } from "vitest";
import {
  daysBetween,
  formatDateRange,
  hackathonPhase,
  phaseLabel,
  todayInIndia,
} from "./dates";

describe("todayInIndia", () => {
  it("uses the Indian calendar day, not UTC", () => {
    // 20:00 UTC on 3 Nov is already 4 Nov, 01:30 in India.
    expect(todayInIndia(new Date("2026-11-03T20:00:00Z"))).toBe("2026-11-04");
    expect(todayInIndia(new Date("2026-11-03T10:00:00Z"))).toBe("2026-11-03");
  });
});

describe("hackathonPhase (HACK-1)", () => {
  it("is upcoming before the start, ongoing on both boundary days, ended after", () => {
    expect(hackathonPhase("2026-12-11", "2026-12-13", "2026-12-10")).toBe("upcoming");
    expect(hackathonPhase("2026-12-11", "2026-12-13", "2026-12-11")).toBe("ongoing");
    expect(hackathonPhase("2026-12-11", "2026-12-13", "2026-12-13")).toBe("ongoing");
    expect(hackathonPhase("2026-12-11", "2026-12-13", "2026-12-14")).toBe("ended");
  });
});

describe("phaseLabel", () => {
  it("counts days across month and year boundaries", () => {
    expect(daysBetween("2026-12-30", "2027-01-02")).toBe(3);
    expect(phaseLabel("2027-01-02", "2027-01-03", "2026-12-30")).toBe("Starts in 3 days");
  });
  it("uses friendly wording", () => {
    expect(phaseLabel("2026-12-11", "2026-12-12", "2026-12-10")).toBe("Starts tomorrow");
    expect(phaseLabel("2026-12-11", "2026-12-12", "2026-12-11")).toBe("Happening now");
    expect(phaseLabel("2026-12-11", "2026-12-12", "2026-12-20")).toBe("Ended");
  });
});

describe("formatDateRange", () => {
  it("formats single-day, same-month and cross-month ranges", () => {
    expect(formatDateRange("2026-12-11", "2026-12-11")).toBe("11 Dec 2026");
    expect(formatDateRange("2026-12-11", "2026-12-13")).toBe("11–13 Dec 2026");
    expect(formatDateRange("2026-11-29", "2026-12-01")).toBe("29 Nov – 1 Dec 2026");
    expect(formatDateRange("2026-12-30", "2027-01-02")).toBe("30 Dec 2026 – 2 Jan 2027");
  });
});
