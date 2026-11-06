"use client";

import { AnimatePresence, motion } from "motion/react";
import { useActionState, useState, useTransition } from "react";
import { grantEarlyAccess, revokeEarlyAccess, type GrantState } from "./actions";

type Member = { id: string; name: string; onboarded: boolean; role: string };

const field =
  "w-full rounded-2xl border border-border bg-background/40 px-4 py-3 text-[15px] focus:border-accent focus:bg-surface focus:outline-none focus:ring-4 focus:ring-accent/20";

/** Give or take away early access to the live site before launch (D24, D25). */
export function AccessPanel({ members }: { members: Member[] }) {
  const [state, action, pending] = useActionState<GrantState, FormData>(grantEarlyAccess, { kind: "idle" });
  const [list, setList] = useState(members);
  const [, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      <section className="reveal rounded-[2rem] bg-surface p-6 shadow-card sm:p-8">
        <h2 className="text-lg font-semibold">Give someone early access</h2>
        <p className="mt-1 text-sm text-muted">
          Add the Gmail address they use with Google. They can then press <b>Continue with Google</b> at{" "}
          <b>findmyteam.tech/login</b> and use the whole app. Anyone not on this list is sent back to the waitlist.
        </p>
        <form action={action} className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">Their Google (Gmail) address</span>
            <input name="email" type="email" required autoComplete="off" className={field} placeholder="friend@gmail.com" />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="h-[50px] rounded-full bg-accent px-6 font-bold text-accent-foreground transition hover:bg-accent-hover active:scale-95 disabled:opacity-60"
          >
            {pending ? "Saving…" : "Give access"}
          </button>
        </form>
        <AnimatePresence mode="wait">
          {state.kind !== "idle" && (
            <motion.p
              key={state.text}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              role={state.kind === "error" ? "alert" : "status"}
              className={`mt-4 rounded-2xl px-4 py-3 text-sm font-medium ${
                state.kind === "ok" ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
              }`}
            >
              {state.text}
            </motion.p>
          )}
        </AnimatePresence>
      </section>

      <section className="reveal rounded-[2rem] bg-surface p-6 shadow-card sm:p-8" style={{ "--i": 1 } as React.CSSProperties}>
        <h2 className="text-lg font-semibold">People with early access</h2>
        <ul className="mt-4 divide-y divide-border">
          <AnimatePresence initial={false}>
            {list.map((m) => (
              <motion.li
                key={m.id}
                layout
                exit={{ opacity: 0, x: -40 }}
                className="flex items-center justify-between gap-4 py-3"
              >
                <span>
                  <span className="font-semibold">{m.name}</span>
                  <span className="ml-2 text-xs text-muted">
                    {m.role === "admin" ? "Admin" : m.onboarded ? "Set up" : "Hasn't finished sign-up yet"}
                  </span>
                </span>
                {m.role !== "admin" && (
                  <button
                    type="button"
                    onClick={() => {
                      setList((l) => l.filter((x) => x.id !== m.id));
                      startTransition(async () => {
                        const r = await revokeEarlyAccess(m.id);
                        if (!r.ok) setList(members);
                      });
                    }}
                    className="rounded-full px-4 py-2 text-sm font-semibold text-danger hover:bg-danger-soft"
                  >
                    Remove access
                  </button>
                )}
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </section>
    </div>
  );
}
