"use client";

import { useState, useTransition } from "react";
import { setCollegeDomain } from "./actions";

type Domain = { domain: string; approved: boolean; students: number };

const field =
  "w-full rounded-2xl border border-border bg-background/40 px-4 py-3 text-[15px] focus:border-accent focus:bg-surface focus:outline-none focus:ring-4 focus:ring-accent/20";

/**
 * D25: the email domains students confirmed a college address with. Approving a real college's
 * domain gives everyone confirmed with it the Verified student badge. Only counts are shown, never addresses.
 */
export function DomainsPanel({ domains }: { domains: Domain[] }) {
  const [list, setList] = useState(domains);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function decide(domain: string, approved: boolean) {
    setError("");
    const before = list;
    setList((l) => {
      const found = l.some((d) => d.domain === domain);
      return found
        ? l.map((d) => (d.domain === domain ? { ...d, approved } : d))
        : [{ domain, approved, students: 0 }, ...l];
    });
    startTransition(async () => {
      const r = await setCollegeDomain(domain, approved);
      if (!r.ok) {
        setList(before);
        setError(`Couldn't save ${domain}. Check it's a college domain like cbit.ac.in, not Gmail.`);
      }
    });
  }

  const waiting = list.filter((d) => !d.approved);
  const approved = list.filter((d) => d.approved);

  return (
    <section className="reveal rounded-[2rem] bg-surface p-6 shadow-card sm:p-8" style={{ "--i": 2 } as React.CSSProperties}>
      <h2 className="text-lg font-semibold">College email domains</h2>
      <p className="mt-1 text-sm text-muted">
        Students get the <b>Verified student</b> badge when they confirm an address on an approved domain. Check a domain
        really belongs to a college before approving it.
      </p>

      <form
        className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          const d = draft.trim().toLowerCase().replace(/^.*@/, "");
          if (d) decide(d, true);
          setDraft("");
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className={field}
          placeholder="Add a college domain, e.g. college.ac.in"
          aria-label="College domain"
        />
        <button
          type="submit"
          disabled={pending}
          className="h-[50px] rounded-full bg-accent px-6 font-bold text-accent-foreground transition hover:bg-accent-hover active:scale-95 disabled:opacity-60"
        >
          Approve
        </button>
      </form>
      {error && (
        <p role="alert" className="mt-3 rounded-2xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
          {error}
        </p>
      )}

      <DomainList title="Waiting for approval" empty="No domains waiting." items={waiting} action="Approve" onAction={(d) => decide(d, true)} />
      <DomainList title="Approved" empty="No approved domains yet." items={approved} action="Remove" danger onAction={(d) => decide(d, false)} />
    </section>
  );
}

function DomainList({
  title,
  empty,
  items,
  action,
  danger = false,
  onAction,
}: {
  title: string;
  empty: string;
  items: Domain[];
  action: string;
  danger?: boolean;
  onAction: (domain: string) => void;
}) {
  return (
    <div className="mt-6">
      <h3 className="text-sm font-semibold text-muted">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-muted">{empty}</p>
      ) : (
        <ul className="mt-2 divide-y divide-border">
          {items.map((d) => (
            <li key={d.domain} className="flex items-center justify-between gap-4 py-3">
              <span>
                <span className="font-semibold">{d.domain}</span>
                <span className="ml-2 text-xs text-muted">
                  {d.students} {d.students === 1 ? "student" : "students"} confirmed
                </span>
              </span>
              <button
                type="button"
                onClick={() => onAction(d.domain)}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  danger ? "text-danger hover:bg-danger-soft" : "text-accent-ink hover:bg-accent-soft"
                }`}
              >
                {action}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
