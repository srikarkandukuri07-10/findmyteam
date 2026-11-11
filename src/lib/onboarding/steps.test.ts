import { describe, expect, it } from "vitest";
import { ONBOARDING_STEPS, onboardingStepFor, stepStates } from "./steps";

describe("ONBOARDING_STEPS (D26)", () => {
  it("is details, great-at, then optional proof of work", () => {
    expect(ONBOARDING_STEPS.map((s) => s.key)).toEqual(["details", "great-at", "proof"]);
    expect(ONBOARDING_STEPS.map((s) => s.optional)).toEqual([false, false, true]);
  });
});

describe("stepStates", () => {
  it("marks earlier steps done and later ones upcoming", () => {
    expect(stepStates(1)).toEqual(["done", "current", "upcoming"]);
  });
});

describe("onboardingStepFor", () => {
  it("sends students to the first unfinished required card", () => {
    expect(onboardingStepFor({ detailsSaved: false, onboarded: false })?.key).toBe("details");
    expect(onboardingStepFor({ detailsSaved: true, onboarded: false })?.key).toBe("great-at");
    expect(onboardingStepFor({ detailsSaved: true, onboarded: true })).toBeNull();
  });
});
