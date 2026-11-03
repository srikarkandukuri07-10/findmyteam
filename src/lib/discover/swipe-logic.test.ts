import { describe, expect, it } from "vitest";
import { DAILY_CONNECTS, connectsLeftText, decideSwipe, firstName, swipeToast } from "./swipe-logic";

describe("decideSwipe (DISC-1, DISC-3)", () => {
  it("commits a long drag to the right as connect and to the left as skip", () => {
    expect(decideSwipe(180, 0)).toBe("connect");
    expect(decideSwipe(-180, 0)).toBe("skip");
  });

  it("snaps back when the drag is short and slow", () => {
    expect(decideSwipe(60, 100)).toBeNull();
    expect(decideSwipe(-60, -100)).toBeNull();
    expect(decideSwipe(0, 0)).toBeNull();
    expect(decideSwipe(110, 0)).toBeNull(); // exactly at the threshold is not past it
  });

  it("commits a quick flick over a short distance", () => {
    expect(decideSwipe(60, 900)).toBe("connect");
    expect(decideSwipe(-60, -900)).toBe("skip");
  });

  it("ignores a fast flick that barely moved, or one in the opposite direction", () => {
    expect(decideSwipe(10, 2000)).toBeNull();
    expect(decideSwipe(60, -900)).toBeNull();
    expect(decideSwipe(-60, 900)).toBeNull();
  });
});

describe("swipe messages", () => {
  it("uses first names", () => {
    expect(firstName("Aarav Sharma")).toBe("Aarav");
    expect(firstName("  Meera   Iyer ")).toBe("Meera");
    expect(firstName("")).toBe("them");
    expect(firstName(null)).toBe("them");
  });

  it("describes each outcome, and a sent request is a success", () => {
    expect(swipeToast("sent", "Aarav Sharma")).toEqual({ tone: "success", text: "Request sent to Aarav" });
    expect(swipeToast("skipped", "Aarav Sharma").text).toBe("Skipped Aarav");
    expect(swipeToast("already", "Aarav Sharma").tone).toBe("info");
    expect(swipeToast("limit", "Aarav Sharma").text).toContain(String(DAILY_CONNECTS));
    expect(swipeToast("error", "x").tone).toBe("warning");
  });

  it("pluralises the counter", () => {
    expect(connectsLeftText(1)).toBe("1 request left today");
    expect(connectsLeftText(0)).toBe("0 requests left today");
    expect(connectsLeftText(25)).toBe("25 requests left today");
  });
});
