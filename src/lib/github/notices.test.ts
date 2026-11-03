import { describe, expect, it } from "vitest";
import { githubNotice, withParam } from "./notices";

describe("withParam", () => {
  it("adds a query string, or extends an existing one", () => {
    expect(withParam("/profile", "github", "connected")).toBe("/profile?github=connected");
    expect(withParam("/hackathons?q=sih", "github", "failed")).toBe("/hackathons?q=sih&github=failed");
  });

  it("replaces an existing value instead of stacking it", () => {
    expect(withParam("/profile?github=failed", "github", "connected")).toBe("/profile?github=connected");
  });
});

describe("githubNotice", () => {
  it("returns a message for known codes, and nothing for unknown or missing ones", () => {
    expect(githubNotice("connected")?.ok).toBe(true);
    expect(githubNotice("denied")?.ok).toBe(false);
    expect(githubNotice(["failed", "connected"])?.text).toMatch(/couldn't load/);
    expect(githubNotice("<script>")).toBeNull();
    expect(githubNotice(undefined)).toBeNull();
  });
});
