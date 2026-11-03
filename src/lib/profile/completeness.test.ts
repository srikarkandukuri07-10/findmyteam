import { describe, expect, it } from "vitest";
import { CHECKS, PROFILE_BUILT_THRESHOLD, profileCompleteness } from "./completeness";

const empty = { bio: null, skillCount: 0, roleCount: 0, githubUsername: null, linkedinUrl: null };

describe("profileCompleteness", () => {
  it("weights add up to 100", () => {
    expect(CHECKS.reduce((s, c) => s + c.weight, 0)).toBe(100);
  });

  it("is 0% for a bare profile and 100% for a full one", () => {
    expect(profileCompleteness(empty).percent).toBe(0);
    expect(
      profileCompleteness({
        bio: "I build computer vision systems for hackathons and love shipping fast.",
        skillCount: 5,
        roleCount: 2,
        githubUsername: "octocat",
        linkedinUrl: "https://www.linkedin.com/in/octocat",
      }).percent,
    ).toBe(100);
  });

  it("needs 3 skills and a bio of 40+ characters", () => {
    expect(profileCompleteness({ ...empty, skillCount: 2 }).percent).toBe(0);
    expect(profileCompleteness({ ...empty, skillCount: 3 }).percent).toBe(30);
    expect(profileCompleteness({ ...empty, bio: "too short" }).percent).toBe(0);
    expect(profileCompleteness({ ...empty, bio: "x".repeat(40) }).percent).toBe(25);
    // Whitespace padding doesn't count towards the length.
    expect(profileCompleteness({ ...empty, bio: `${" ".repeat(50)}hi` }).percent).toBe(0);
  });

  it("counts a profile as built with skills, bio and a role, without GitHub or LinkedIn", () => {
    const { percent } = profileCompleteness({ ...empty, skillCount: 3, bio: "x".repeat(40), roleCount: 1 });
    expect(percent).toBeGreaterThanOrEqual(PROFILE_BUILT_THRESHOLD);
  });

  it("lists what is missing", () => {
    const { missing } = profileCompleteness({ ...empty, skillCount: 3 });
    expect(missing.map((m) => m.key)).toEqual(["bio", "github", "roles", "linkedin"]);
  });
});
