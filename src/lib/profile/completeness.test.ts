import { describe, expect, it } from "vitest";
import { CHECKS, PROFILE_BUILT_THRESHOLD, profileCompleteness } from "./completeness";

const empty = { bio: null, skillCount: 0, roleCount: 0, githubConnected: false, linkedinUrl: null };

describe("profileCompleteness (D26 Scout boost)", () => {
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
        githubConnected: true,
        linkedinUrl: "https://www.linkedin.com/in/octocat",
        collegeVerified: true,
        pastHackathons: 1,
        interestCount: 2,
      }).percent,
    ).toBe(100);
  });

  it("counts GitHub only when connected", () => {
    expect(profileCompleteness({ ...empty, githubConnected: true }).percent).toBe(15);
  });

  it("needs 3 skills and a bio of 40+ characters", () => {
    expect(profileCompleteness({ ...empty, skillCount: 2 }).percent).toBe(0);
    expect(profileCompleteness({ ...empty, skillCount: 3 }).percent).toBe(20);
    expect(profileCompleteness({ ...empty, bio: "x".repeat(40) }).percent).toBe(20);
    expect(profileCompleteness({ ...empty, bio: `${" ".repeat(50)}hi` }).percent).toBe(0);
  });

  it("needs proof of work, not just the required card, to count as strong", () => {
    const required = profileCompleteness({ ...empty, skillCount: 3, bio: "x".repeat(40), roleCount: 1 });
    expect(required.percent).toBeLessThan(PROFILE_BUILT_THRESHOLD);
    const withProof = profileCompleteness({ ...empty, skillCount: 3, bio: "x".repeat(40), githubConnected: true, collegeVerified: true });
    expect(withProof.percent).toBeGreaterThanOrEqual(PROFILE_BUILT_THRESHOLD);
  });

  it("lists what is missing, most valuable first", () => {
    const { missing } = profileCompleteness({ ...empty, skillCount: 3 });
    expect(missing.map((m) => m.key)).toEqual(["bio", "github", "verified", "linkedin", "hackathons", "roles", "interests"]);
  });
});
