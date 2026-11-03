import { ViewTransition } from "react";
import type { ReactNode } from "react";

/**
 * Wraps a page's top-level element so route changes animate: the page being left slides out to
 * the left and fades, the new page slides in from the right (and the reverse for "back" links,
 * which pass transitionTypes={["nav-back"]}). Navigations with no type, such as a form
 * redirecting to the next step, count as forward. CSS lives in globals.css.
 *
 * Must wrap each page's own element, not a layout: layouts stay mounted, so they never enter or exit.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition
      enter={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "nav-forward" }}
      exit={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "nav-forward" }}
      default="none"
    >
      {children}
    </ViewTransition>
  );
}

/** Link props for a "back" link, so the animation runs the other way. */
export const BACK_TRANSITION = ["nav-back"];
