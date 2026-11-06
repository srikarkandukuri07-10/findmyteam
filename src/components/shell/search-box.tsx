"use client";

import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useId, useRef, useState, useTransition, type ReactNode } from "react";
import { searchEverything, type SearchResult } from "@/app/(app)/(shell)/search-actions";
import { SearchIcon, TeamsIcon } from "@/components/icons";
import { avatarSrc } from "@/lib/avatar";

type Option = { key: string; href: string };

/** Bold the part of `text` that matches what was typed. */
function Highlight({ text, query }: { text: string; query: string }): ReactNode {
  const i = text.toLowerCase().indexOf(query.trim().toLowerCase());
  if (!query.trim() || i < 0) return text;
  const end = i + query.trim().length;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded bg-accent-soft px-0.5 font-bold text-accent-ink">{text.slice(i, end)}</mark>
      {text.slice(end)}
    </>
  );
}

/**
 * SRCH-1: universal search. Suggestions appear with every letter (people by name, skill or college,
 * and teams); arrow keys move, Enter opens, Esc closes, Ctrl/⌘ K focuses it from anywhere.
 */
export function SearchBox() {
  const router = useRouter();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pending, startTransition] = useTransition();
  const latest = useRef(0);

  // Debounced fetch; an older answer never replaces a newer one.
  useEffect(() => {
    const q = query.trim();
    if (!q) return;
    const ticket = ++latest.current;
    const t = window.setTimeout(() => {
      startTransition(async () => {
        const r = await searchEverything(q);
        if (ticket === latest.current) {
          setResult(r);
          setActive(0);
        }
      });
    }, 140);
    return () => window.clearTimeout(t);
  }, [query]);

  // Ctrl/⌘ K from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const shown = query.trim() ? result : null;
  const options: Option[] = [
    ...(shown?.people ?? []).map((p) => ({ key: p.id, href: `/students/${p.id}` })),
    ...(shown?.teams ?? []).map((t) => ({ key: t.id, href: `/teams/${t.id}` })),
  ];

  const go = (href: string) => {
    setOpen(false);
    setQuery("");
    setResult(null);
    inputRef.current?.blur();
    router.push(href);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && options[active]) {
      e.preventDefault();
      go(options[active].href);
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const showPanel = open && query.trim().length > 0;

  return (
    <div ref={boxRef} className="relative w-full max-w-xl">
      <label className="group flex h-12 w-full items-center gap-3 rounded-full border border-border bg-surface px-5 shadow-card transition focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/20">
        <SearchIcon className="size-5 shrink-0 text-muted transition group-focus-within:text-accent-ink" />
        <span className="sr-only">Search people, teams or skills</span>
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showPanel && options[active] ? `${listId}-${options[active].key}` : undefined}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search for people, teams or skills…"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-[15px] placeholder:text-muted/80 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        {pending ? (
          <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        ) : (
          <kbd className="hidden rounded-lg bg-surface-muted px-2 py-1 font-sans text-xs font-semibold text-muted sm:block">
            Ctrl K
          </kbd>
        )}
      </label>

      <AnimatePresence>
        {showPanel && (
          <motion.div
            id={listId}
            role="listbox"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98, transition: { duration: 0.15 } }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="absolute inset-x-0 top-full z-50 mt-2 max-h-[70vh] origin-top overflow-y-auto rounded-3xl bg-surface p-2 shadow-lift"
          >
            {shown === null ? (
              <p className="px-4 py-6 text-center text-sm text-muted">Searching…</p>
            ) : shown.limited ? (
              <p className="px-4 py-6 text-center text-sm text-muted">
                Too many searches. Wait a minute and try again.
              </p>
            ) : options.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted">
                No one matches &ldquo;{query.trim()}&rdquo;. Try a first name, a skill like React, or a college.
              </p>
            ) : (
              <>
                {shown.people.length > 0 && (
                  <p className="px-3 pb-1 pt-2 text-xs font-bold uppercase tracking-widest text-muted">People</p>
                )}
                {shown.people.map((p, i) => {
                  return (
                    <motion.button
                      key={p.id}
                      id={`${listId}-${p.id}`}
                      type="button"
                      role="option"
                      aria-selected={active === i}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => go(`/students/${p.id}`)}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors ${
                        active === i ? "bg-accent-soft" : ""
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={avatarSrc(p.id, p.avatar_path)}
                        alt=""
                        className="size-10 shrink-0 rounded-full bg-accent-soft object-cover"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate font-semibold">
                            <Highlight text={p.name} query={query} />
                          </span>
                          {p.is_demo && (
                            <span className="rounded-full bg-chip px-2 py-0.5 text-[10px] font-semibold uppercase">
                              Sample
                            </span>
                          )}
                        </span>
                        <span className="block truncate text-xs text-muted">
                          {p.matched_skill ? (
                            <>
                              Skill: <Highlight text={p.matched_skill} query={query} /> ·{" "}
                            </>
                          ) : (
                            p.roles[0] && `${p.roles[0]} · `
                          )}
                          {p.college ? <Highlight text={p.college} query={query} /> : null}
                        </span>
                      </span>
                      <span className="hidden shrink-0 text-xs text-muted sm:block">Year {p.year}</span>
                    </motion.button>
                  );
                })}
                {shown.teams.length > 0 && (
                  <p className="px-3 pb-1 pt-3 text-xs font-bold uppercase tracking-widest text-muted">Teams</p>
                )}
                {shown.teams.map((t, n) => {
                  const i = shown.people.length + n;
                  return (
                    <motion.button
                      key={t.id}
                      id={`${listId}-${t.id}`}
                      type="button"
                      role="option"
                      aria-selected={active === i}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => go(`/teams/${t.id}`)}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors ${
                        active === i ? "bg-accent-soft" : ""
                      }`}
                    >
                      <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[#3b3163] text-surface">
                        <TeamsIcon className="size-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">
                          <Highlight text={t.name} query={query} />
                        </span>
                        <span className="block truncate text-xs text-muted">
                          {t.members} members{t.hackathon ? ` · ${t.hackathon}` : ""}
                        </span>
                      </span>
                    </motion.button>
                  );
                })}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
