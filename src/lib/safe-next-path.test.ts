import { describe, expect, it } from "vitest";
import { safeNextPath } from "./safe-next-path";

describe("safeNextPath", () => {
  it("keeps same-site paths with their query", () => {
    expect(safeNextPath("/home")).toBe("/home");
    expect(safeNextPath("/teams?hackathon=sih")).toBe("/teams?hackathon=sih");
  });

  it.each([
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "javascript:alert(1)",
    "home",
    "",
    null,
    undefined,
  ])("falls back for %s", (next) => {
    expect(safeNextPath(next)).toBe("/home");
  });
});
