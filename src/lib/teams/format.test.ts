import { describe, expect, it } from "vitest";
import { sinceLabel } from "./format";

describe("sinceLabel (D29)", () => {
  const now = Date.parse("2026-11-12T10:00:00+05:30");
  it("says today, yesterday, or the date", () => {
    expect(sinceLabel("2026-11-12T08:00:00+05:30", now)).toBe("today");
    expect(sinceLabel("2026-11-11T08:00:00+05:30", now)).toBe("yesterday");
    expect(sinceLabel("2026-11-02T08:00:00+05:30", now)).toBe("on 2 Nov");
  });
});
