import { ONBOARDING_STEPS, stepStates } from "@/lib/onboarding/steps";

/**
 * Progress through the guided setup. The line between two steps fills in (animated, from the
 * left) once the earlier step is done. `current` is the zero-based index of the step on screen.
 */
export function OnboardingStepper({ current }: { current: number }) {
  const states = stepStates(current);

  return (
    <nav aria-label="Setup progress" className="mb-5">
      <ol className="flex">
        {ONBOARDING_STEPS.map((step, i) => {
          const state = states[i];
          const isLast = i === ONBOARDING_STEPS.length - 1;
          return (
            <li key={step.key} className="relative flex-1 text-center" aria-current={state === "current" ? "step" : undefined}>
              {!isLast && (
                <span aria-hidden className="absolute left-1/2 top-4 h-0.5 w-full -translate-y-1/2 rounded-full bg-chip">
                  {state === "done" && <span className="step-line block h-full w-full rounded-full bg-accent" />}
                </span>
              )}
              <span
                aria-hidden
                className={`relative mx-auto grid size-8 place-items-center rounded-full text-sm font-semibold transition-colors duration-300 ${
                  state === "done"
                    ? "bg-accent text-accent-foreground"
                    : state === "current"
                      ? "bg-surface text-accent-ink ring-2 ring-accent"
                      : "bg-chip text-muted"
                }`}
              >
                {state === "done" ? "✓" : i + 1}
              </span>
              <span className={`mt-2 block px-1 text-xs leading-tight ${state === "upcoming" ? "text-muted" : "font-medium"}`}>
                {step.label}
                {step.optional && <span className="block font-normal text-muted">optional</span>}
              </span>
              <span className="sr-only">{state === "done" ? " (completed)" : state === "current" ? " (current step)" : ""}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
