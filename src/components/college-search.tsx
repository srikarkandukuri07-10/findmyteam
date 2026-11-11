"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { addCollege, searchColleges, type CollegeOption } from "@/app/(app)/onboarding/college-actions";

/** States and union territories of India, for "Add your college". */
const STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana",
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

const control =
  "block w-full rounded-xl border border-border bg-surface-muted px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25";

/**
 * D26: type a college or university and pick it from suggestions. The chosen id goes into a hidden
 * input named `name`. A missing college can be added on the spot; it waits for an admin's review.
 */
export function CollegeSearch({
  name,
  form,
  initial,
  error,
}: {
  name: string;
  form?: string;
  initial: CollegeOption | null;
  error?: string;
}) {
  const [picked, setPicked] = useState<CollegeOption | null>(initial);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CollegeOption[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [searching, startSearch] = useTransition();
  const [saving, startSave] = useTransition();
  const listId = useId();
  const seq = useRef(0);

  // Search 200 ms after typing stops; only the latest answer is shown.
  useEffect(() => {
    if (query.trim().length < 2) return;
    const mine = ++seq.current;
    const t = setTimeout(() => {
      startSearch(async () => {
        const r = await searchColleges(query);
        if (mine === seq.current) {
          setResults(r);
          setActive(0);
        }
      });
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  const showList = open && query.trim().length >= 2;

  function choose(c: CollegeOption) {
    setPicked(c);
    setOpen(false);
    setQuery("");
    setResults([]);
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} form={form} value={picked?.id ?? ""} />
      {picked ? (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-accent/40 bg-accent-soft px-3.5 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold">{picked.name}</p>
            <p className="text-xs text-muted">
              {[picked.place, picked.kind === "university" ? "University" : null, picked.pending ? "Waiting for review" : null]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPicked(null)}
            className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold text-accent-ink hover:bg-surface"
          >
            Change
          </button>
        </div>
      ) : (
        <div className="relative">
          <input
            id={name}
            type="text"
            role="combobox"
            aria-expanded={showList}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-invalid={error ? true : undefined}
            autoComplete="off"
            placeholder="Start typing your college or university"
            className={control}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={(e) => {
              if (!showList || results.length === 0) return;
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                choose(results[active]);
              } else if (e.key === "Escape") {
                setOpen(false);
              }
            }}
          />
          {showList && (
            <ul
              id={listId}
              role="listbox"
              className="absolute inset-x-0 top-full z-30 mt-1.5 max-h-80 overflow-auto rounded-2xl bg-surface p-1.5 shadow-lift"
            >
              {results.map((c, i) => (
                <li
                  key={c.id}
                  role="option"
                  aria-selected={i === active}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choose(c);
                  }}
                  onMouseEnter={() => setActive(i)}
                  className={`cursor-pointer rounded-xl px-3 py-2.5 ${i === active ? "bg-accent-soft" : ""}`}
                >
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-muted">
                    {[c.place, c.kind === "university" ? "University" : null].filter(Boolean).join(" · ")}
                  </p>
                </li>
              ))}
              {!searching && results.length === 0 && (
                <li className="px-3 py-2.5 text-sm text-muted">No match yet. Keep typing, or add your college below.</li>
              )}
              {searching && results.length === 0 && <li className="px-3 py-2.5 text-sm text-muted">Searching…</li>}
            </ul>
          )}
        </div>
      )}
      {error && !picked && <p className="text-xs text-danger">{error}</p>}

      {!picked && !adding && (
        <button type="button" onClick={() => setAdding(true)} className="text-xs font-semibold text-accent-ink">
          Can&apos;t find your college? Add it
        </button>
      )}
      {!picked && adding && (
        <div className="space-y-3 rounded-2xl border border-dashed border-border p-4">
          <p className="text-sm font-semibold">Add your college</p>
          <AddCollegeFields
            saving={saving}
            error={addError}
            onCancel={() => setAdding(false)}
            onSubmit={(v) =>
              startSave(async () => {
                setAddError("");
                const r = await addCollege(v);
                if (r.ok) {
                  choose(r.college);
                  setAdding(false);
                } else setAddError(r.error);
              })
            }
          />
        </div>
      )}
    </div>
  );
}

function AddCollegeFields({
  saving,
  error,
  onCancel,
  onSubmit,
}: {
  saving: boolean;
  error: string;
  onCancel: () => void;
  onSubmit: (v: { name: string; state: string; district: string }) => void;
}) {
  const [name, setName] = useState("");
  const [state, setState] = useState("");
  const [district, setDistrict] = useState("");
  return (
    <>
      <input className={control} placeholder="Full college name" value={name} onChange={(e) => setName(e.target.value)} aria-label="College name" />
      <div className="grid gap-3 sm:grid-cols-2">
        <select className={control} value={state} onChange={(e) => setState(e.target.value)} aria-label="State">
          <option value="">State</option>
          {STATES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <input className={control} placeholder="City or district" value={district} onChange={(e) => setDistrict(e.target.value)} aria-label="City or district" />
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => onSubmit({ name, state, district })}
          className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-60"
        >
          {saving ? "Adding…" : "Add and use it"}
        </button>
        <button type="button" onClick={onCancel} className="rounded-full px-4 py-2 text-sm font-semibold text-muted hover:bg-surface-muted">
          Cancel
        </button>
      </div>
    </>
  );
}
