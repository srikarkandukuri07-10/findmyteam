export type SwipeAction = "connect" | "skip";
export type SwipeResult = "sent" | "skipped" | "already" | "limit" | "error";

/** How many connection requests a student can send in 24 hours (PRD DISC-7). */
export const DAILY_CONNECTS = 25;

/** Drag further than this (pixels) and the card is committed. */
export const SWIPE_DISTANCE = 110;
/** A quick flick (pixels per second) commits the card with a shorter drag. */
export const SWIPE_VELOCITY = 500;
const FLICK_MIN_DISTANCE = 40;

/** Turns the end of a drag into a decision: right = connect, left = skip, null = snap back. */
export function decideSwipe(offsetX: number, velocityX: number): SwipeAction | null {
  if (offsetX > SWIPE_DISTANCE || (offsetX > FLICK_MIN_DISTANCE && velocityX > SWIPE_VELOCITY)) return "connect";
  if (offsetX < -SWIPE_DISTANCE || (offsetX < -FLICK_MIN_DISTANCE && velocityX < -SWIPE_VELOCITY)) return "skip";
  return null;
}

export function firstName(fullName: string | null | undefined) {
  return (fullName ?? "").trim().split(/\s+/)[0] || "them";
}

export type ToastTone = "success" | "info" | "warning";

/** What to tell the student after a swipe. */
export function swipeToast(result: SwipeResult, name: string): { tone: ToastTone; text: string } {
  const who = firstName(name);
  switch (result) {
    case "sent":
      return { tone: "success", text: `Request sent to ${who}` };
    case "skipped":
      return { tone: "info", text: `Skipped ${who}` };
    case "already":
      return { tone: "info", text: `You already have a request with ${who}` };
    case "limit":
      return { tone: "warning", text: `You've used today's ${DAILY_CONNECTS} requests. You can still skip.` };
    default:
      return { tone: "warning", text: "Something went wrong. Please try again." };
  }
}

/** "1 request left today" / "12 requests left today". */
export function connectsLeftText(left: number) {
  return `${left} ${left === 1 ? "request" : "requests"} left today`;
}
