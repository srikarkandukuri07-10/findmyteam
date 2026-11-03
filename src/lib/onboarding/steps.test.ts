import { describe, expect, it } from "vitest";
import { ONBOARDING_STEPS, nextSetupStep, stepStates } from "./steps";

describe("onboarding steps", () => {
  it("runs account, then GitHub (optional), then profile", () => {
    expect(ONBOARDING_STEPS.map((s) => s.key)).toEqual(["account", "github", "profile"]);
    expect(ONBOARDING_STEPS.map((s) => s.optional)).toEqual([false, true, true]);
  });

  it("marks earlier steps done, the current one active and later ones upcoming", () => {
    expect(stepStates(0)).toEqual(["current", "upcoming", "upcoming"]);
    expect(stepStates(1)).toEqual(["done", "current", "upcoming"]);
    expect(stepStates(2)).toEqual(["done", "done", "current"]);
  });
});

describe("nextSetupStep", () => {
  it("suggests GitHub first, then the profile, then nothing", () => {
    expect(nextSetupStep({ githubConnected: false, profilePercent: 0 })?.key).toBe("github");
    expect(nextSetupStep({ githubConnected: false, profilePercent: 100 })?.key).toBe("github");
    expect(nextSetupStep({ githubConnected: true, profilePercent: 20 })?.key).toBe("profile");
    expect(nextSetupStep({ githubConnected: true, profilePercent: 70 })).toBeNull();
  });
});
