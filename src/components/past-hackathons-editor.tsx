"use client";

import { useActionState, useState, useTransition } from "react";
import { addPastHackathon, deletePastHackathon, type HackathonFormState } from "@/app/(app)/onboarding/connect/actions";
import { Field, FormMessage, Input, Select } from "@/components/form";
import { RESULT_LABELS } from "@/lib/validation/onboarding";

export type PastHackathon = {
  id: string;
  name: string;
  year: number;
  result: "participated" | "finalist" | "winner";
  idea: string | null;
  live_url: string | null;
  demo_url: string | null;
};

const RESULT_TONE = {
  winner: "bg-[#fdf1c7] text-[#8a6100]",
  finalist: "bg-accent-soft text-accent-ink",
  participated: "bg-chip text-muted",
} as const;

/** D26: list and add past hackathons. Winners and finalists can add the idea, live link and demo. */
export function PastHackathonsEditor({ items, currentYear }: { items: PastHackathon[]; currentYear: number }) {
  const [state, action, pending] = useActionState<HackathonFormState, FormData>(addPastHackathon, {});
  const [open, setOpen] = useState(items.length === 0);
  const [result, setResult] = useState("");
  const [removing, startRemove] = useTransition();
  const [hidden, setHidden] = useState<string[]>([]);
  const e = state.errors ?? {};
  const v = state.values ?? {};
  const years = Array.from({ length: currentYear - 2014 }, (_, i) => currentYear - i);

  // Close the form once after each successful add.
  const [seenSave, setSeenSave] = useState<number | undefined>(undefined);
  if (state.savedAt && state.savedAt !== seenSave) {
    setSeenSave(state.savedAt);
    setOpen(false);
    setResult("");
  }

  const shown = items.filter((h) => !hidden.includes(h.id));

  return (
    <div className="space-y-3">
      {shown.length > 0 && (
        <ul className="space-y-2">
          {shown.map((h) => (
            <li key={h.id} className="flex items-start justify-between gap-3 rounded-2xl bg-surface-muted p-4">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 font-semibold">
                  {h.name} <span className="text-sm font-normal text-muted">{h.year}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${RESULT_TONE[h.result]}`}>{RESULT_LABELS[h.result]}</span>
                </p>
                {h.idea && <p className="mt-1 text-sm text-muted">{h.idea}</p>}
                <p className="mt-1 flex flex-wrap gap-3 text-sm">
                  {h.live_url && (
                    <a href={h.live_url} target="_blank" rel="noreferrer" className="font-medium text-accent-ink">
                      Live app ↗
                    </a>
                  )}
                  {h.demo_url && (
                    <a href={h.demo_url} target="_blank" rel="noreferrer" className="font-medium text-accent-ink">
                      MVP / demo ↗
                    </a>
                  )}
                </p>
              </div>
              <button
                type="button"
                disabled={removing}
                onClick={() => {
                  setHidden((x) => [...x, h.id]);
                  startRemove(async () => {
                    const r = await deletePastHackathon(h.id);
                    if (!r.ok) setHidden((x) => x.filter((id) => id !== h.id));
                  });
                }}
                className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold text-danger hover:bg-danger-soft"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full rounded-2xl border border-dashed border-border px-4 py-3 text-sm font-semibold text-accent-ink hover:bg-accent-soft"
        >
          + Add a hackathon
        </button>
      ) : (
        <form action={action} className="space-y-4 rounded-2xl border border-border p-4" noValidate>
          <FormMessage message={state.message} />
          <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
            <Field label="Hackathon" name="name" error={e.name}>
              <Input name="name" placeholder="e.g. Smart India Hackathon" defaultValue={v.name} error={e.name} />
            </Field>
            <Field label="Year" name="year" error={e.year}>
              <Select name="year" defaultValue={v.year ?? ""} error={e.year}>
                <option value="" disabled>
                  Year
                </option>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">How did it go?</legend>
            <div className="flex flex-wrap gap-2">
              {(["participated", "finalist", "winner"] as const).map((r) => (
                <label
                  key={r}
                  className={`cursor-pointer rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                    result === r ? "bg-accent text-accent-foreground" : "bg-chip hover:bg-accent-soft"
                  }`}
                >
                  <input type="radio" name="result" value={r} className="sr-only" checked={result === r} onChange={() => setResult(r)} />
                  {r === "winner" ? "🏆 " : ""}
                  {RESULT_LABELS[r]}
                </label>
              ))}
            </div>
            {e.result && <p className="text-xs text-danger">{e.result}</p>}
          </fieldset>
          {(result === "winner" || result === "finalist") && (
            <div className="space-y-4 rounded-2xl bg-accent-soft/60 p-4">
              <p className="text-sm font-medium">Show what you built (optional)</p>
              <Field label="The idea" name="idea" error={e.idea}>
                <Input name="idea" placeholder="One line on what it does" maxLength={400} defaultValue={v.idea} error={e.idea} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Live link" name="liveUrl" error={e.liveUrl}>
                  <Input name="liveUrl" type="url" placeholder="https://…" defaultValue={v.liveUrl} error={e.liveUrl} />
                </Field>
                <Field label="MVP / demo link" name="demoUrl" error={e.demoUrl}>
                  <Input name="demoUrl" type="url" placeholder="https://…" defaultValue={v.demoUrl} error={e.demoUrl} />
                </Field>
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent-hover disabled:opacity-60"
            >
              {pending ? "Adding…" : "Add hackathon"}
            </button>
            {shown.length > 0 && (
              <button type="button" onClick={() => setOpen(false)} className="rounded-full px-4 py-2 text-sm font-semibold text-muted hover:bg-surface-muted">
                Cancel
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
