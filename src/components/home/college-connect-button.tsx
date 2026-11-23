"use client";

import { useState, useTransition } from "react";
import { swipePerson } from "@/app/(app)/(shell)/discover/actions";

/** Sends a team-up request, the same as swiping right in Scout (it counts toward the 25 a day). */
export function CollegeConnectButton({ id, name }: { id: string; name: string }) {
  const [state, setState] = useState<"idle" | "sent" | "limit" | "error">("idle");
  const [pending, start] = useTransition();
  const first = name.split(" ")[0] ?? name;

  if (state === "sent") {
    return <span className="shrink-0 rounded-full bg-success-soft px-3.5 py-1.5 text-xs font-bold text-success">Requested ✓</span>;
  }
  return (
    <button
      type="button"
      disabled={pending || state === "limit"}
      aria-label={`Send ${first} a team-up request`}
      title={state === "limit" ? "You've used today's 25 requests." : state === "error" ? "Couldn't send. Try again." : undefined}
      onClick={() =>
        start(async () => {
          const { result } = await swipePerson(id, "connect");
          setState(result === "sent" || result === "already" ? "sent" : result === "limit" ? "limit" : "error");
        })
      }
      className="shrink-0 rounded-full bg-accent px-4 py-1.5 text-xs font-bold text-accent-foreground transition active:scale-95 disabled:opacity-60"
    >
      {pending ? "…" : state === "limit" ? "Limit reached" : state === "error" ? "Retry" : "Connect"}
    </button>
  );
}
