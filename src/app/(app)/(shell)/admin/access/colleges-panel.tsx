"use client";

import { useState, useTransition } from "react";
import { setCollegeStatus } from "./actions";

type Pending = { id: number; name: string; place: string; students: number };

/** D26: colleges students added because they weren't in the AISHE list. Approve real ones. */
export function CollegesPanel({ pending }: { pending: Pending[] }) {
  const [list, setList] = useState(pending);
  const [, start] = useTransition();

  function decide(c: Pending, approved: boolean) {
    setList((l) => l.filter((x) => x.id !== c.id));
    start(async () => {
      const r = await setCollegeStatus(c.id, approved);
      if (!r.ok) setList((l) => [c, ...l]);
    });
  }

  return (
    <section className="reveal rounded-[2rem] bg-surface p-6 shadow-card sm:p-8" style={{ "--i": 3 } as React.CSSProperties}>
      <h2 className="text-lg font-semibold">Colleges added by students</h2>
      <p className="mt-1 text-sm text-muted">
        Students can use a college they added straight away. Approve it so others can find it too; reject anything fake.
      </p>
      {list.length === 0 ? (
        <p className="mt-4 text-sm text-muted">Nothing waiting.</p>
      ) : (
        <ul className="mt-4 divide-y divide-border">
          {list.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <span>
                <span className="font-semibold">{c.name}</span>
                <span className="ml-2 text-xs text-muted">
                  {c.place} · {c.students} {c.students === 1 ? "student" : "students"}
                </span>
              </span>
              <span className="flex gap-2">
                <button type="button" onClick={() => decide(c, true)} className="rounded-full px-4 py-2 text-sm font-semibold text-accent-ink hover:bg-accent-soft">
                  Approve
                </button>
                <button type="button" onClick={() => decide(c, false)} className="rounded-full px-4 py-2 text-sm font-semibold text-danger hover:bg-danger-soft">
                  Reject
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
