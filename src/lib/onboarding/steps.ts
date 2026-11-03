import { PROFILE_BUILT_THRESHOLD } from "@/lib/profile/completeness";

export type OnboardingStep = { key: "account" | "github" | "profile"; label: string; optional: boolean; href: string };

/** The guided flow shown right after sign-up. Only the first step is required. */
export const ONBOARDING_STEPS: readonly OnboardingStep[] = [
  { key: "account", label: "Create your account", optional: false, href: "/onboarding" },
  { key: "github", label: "Connect GitHub", optional: true, href: "/onboarding/connect" },
  { key: "profile", label: "Build your profile", optional: true, href: "/onboarding/profile" },
];

export type StepState = "done" | "current" | "upcoming";

/** `current` is the zero-based index of the step being shown. */
export function stepStates(current: number): StepState[] {
  return ONBOARDING_STEPS.map((_, i) => (i < current ? "done" : i === current ? "current" : "upcoming"));
}

/**
 * Where "Continue setup" on the home page should lead, or null when there is nothing left.
 * GitHub comes before the profile, matching the guided flow.
 */
export function nextSetupStep(progress: { githubConnected: boolean; profilePercent: number }) {
  if (!progress.githubConnected) return ONBOARDING_STEPS[1];
  if (progress.profilePercent < PROFILE_BUILT_THRESHOLD) return ONBOARDING_STEPS[2];
  return null;
}
