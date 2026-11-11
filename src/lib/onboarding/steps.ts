export type OnboardingStep = { key: "details" | "great-at" | "proof"; label: string; optional: boolean; href: string };

/**
 * The guided flow right after sign-up (D26). Cards 1 and 2 are required; finishing Card 2 finishes
 * onboarding. Card 3 is optional proof of work that ranks the student higher in Scout.
 */
export const ONBOARDING_STEPS: readonly OnboardingStep[] = [
  { key: "details", label: "You & your college", optional: false, href: "/onboarding" },
  { key: "great-at", label: "What you're great at", optional: false, href: "/onboarding/profile" },
  { key: "proof", label: "Proof of work", optional: true, href: "/onboarding/connect" },
];

export type StepState = "done" | "current" | "upcoming";

/** `current` is the zero-based index of the step being shown. */
export function stepStates(current: number): StepState[] {
  return ONBOARDING_STEPS.map((_, i) => (i < current ? "done" : i === current ? "current" : "upcoming"));
}

/** Where a student who hasn't finished onboarding belongs. */
export function onboardingStepFor(state: { detailsSaved: boolean; onboarded: boolean }) {
  if (!state.detailsSaved) return ONBOARDING_STEPS[0];
  if (!state.onboarded) return ONBOARDING_STEPS[1];
  return null;
}
