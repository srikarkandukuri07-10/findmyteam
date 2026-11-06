"use client";

import { useState } from "react";
import { MAX_ROLES, MAX_SKILLS, SKILL_LEVELS, SKILL_LEVEL_LABELS, type SkillLevel } from "@/lib/validation/profile";

type SkillOption = { id: number; name: string; category: "technical" | "non_technical" };
type RoleOption = { id: number; name: string };

const chip =
  "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40";

/** Tap skills to add them, then set a level for each. Submits as repeated `skill` fields ("id:level"). */
export function SkillPicker({
  options,
  initial,
  error,
}: {
  options: SkillOption[];
  initial: { id: number; level: SkillLevel }[];
  error?: string;
}) {
  const [selected, setSelected] = useState(initial);
  const [filter, setFilter] = useState("");
  const full = selected.length >= MAX_SKILLS;
  const byId = new Map(options.map((o) => [o.id, o]));

  function toggle(id: number) {
    setSelected((cur) =>
      cur.some((s) => s.id === id)
        ? cur.filter((s) => s.id !== id)
        : cur.length >= MAX_SKILLS
          ? cur
          : [...cur, { id, level: "intermediate" }],
    );
  }

  function setLevel(id: number, level: SkillLevel) {
    setSelected((cur) => cur.map((s) => (s.id === id ? { ...s, level } : s)));
  }

  const q = filter.trim().toLowerCase();
  const visible = options.filter((o) => o.name.toLowerCase().includes(q));
  const groups = [
    { title: "Technical", items: visible.filter((o) => o.category === "technical") },
    { title: "Other", items: visible.filter((o) => o.category === "non_technical") },
  ];

  return (
    <div className="space-y-4">
      {selected.map((s) => (
        <input key={s.id} type="hidden" name="skill" value={`${s.id}:${s.level}`} />
      ))}

      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium">Skills</p>
        <p className={`text-xs ${full ? "text-danger" : "text-muted"}`}>
          {selected.length} of {MAX_SKILLS} chosen
        </p>
      </div>

      {selected.length > 0 && (
        <ul className="space-y-2 rounded-2xl bg-surface-muted p-3">
          {selected.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium">{byId.get(s.id)?.name}</span>
              <span className="flex items-center gap-2">
                <label className="sr-only" htmlFor={`level-${s.id}`}>
                  Level for {byId.get(s.id)?.name}
                </label>
                <select
                  id={`level-${s.id}`}
                  value={s.level}
                  onChange={(e) => setLevel(s.id, e.target.value as SkillLevel)}
                  className="rounded-full border border-border bg-surface px-3 py-1 text-sm"
                >
                  {SKILL_LEVELS.map((l) => (
                    <option key={l} value={l}>
                      {SKILL_LEVEL_LABELS[l]}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => toggle(s.id)}
                  aria-label={`Remove ${byId.get(s.id)?.name}`}
                  className="grid size-7 place-items-center rounded-full text-muted hover:bg-chip hover:text-foreground"
                >
                  ×
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <label className="sr-only" htmlFor="skill-filter">
        Search skills
      </label>
      <input
        id="skill-filter"
        type="search"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.preventDefault(); // Enter should filter, not submit the form
        }}
        placeholder="Search skills, e.g. Python"
        className="block w-full rounded-full border border-border bg-surface-muted px-4 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
      />

      {groups.map(
        (g) =>
          g.items.length > 0 && (
            <div key={g.title} className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">{g.title}</p>
              <div className="flex flex-wrap gap-2">
                {g.items.map((o) => {
                  const on = selected.some((s) => s.id === o.id);
                  return (
                    <button
                      key={o.id}
                      type="button"
                      aria-pressed={on}
                      disabled={!on && full}
                      onClick={() => toggle(o.id)}
                      className={`${chip} ${on ? "bg-accent text-accent-foreground" : "bg-chip hover:bg-accent-soft"}`}
                    >
                      {o.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ),
      )}
      {visible.length === 0 && <p className="text-sm text-muted">No skill matches “{filter}”.</p>}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

/** Up to three preferred roles. Submits as repeated `role` fields. */
export function RolePicker({
  options,
  initial,
  error,
}: {
  options: RoleOption[];
  initial: number[];
  error?: string;
}) {
  const [selected, setSelected] = useState(initial);
  const full = selected.length >= MAX_ROLES;

  return (
    <div className="space-y-3">
      {selected.map((id) => (
        <input key={id} type="hidden" name="role" value={id} />
      ))}
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium">Roles you want in a team</p>
        <p className={`text-xs ${full ? "text-danger" : "text-muted"}`}>
          {selected.length} of {MAX_ROLES} chosen
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = selected.includes(o.id);
          return (
            <button
              key={o.id}
              type="button"
              aria-pressed={on}
              disabled={!on && full}
              onClick={() => setSelected((cur) => (on ? cur.filter((id) => id !== o.id) : [...cur, o.id]))}
              className={`${chip} ${on ? "bg-accent text-accent-foreground" : "bg-chip hover:bg-accent-soft"}`}
            >
              {o.name}
            </button>
          );
        })}
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
