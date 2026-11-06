"use client";

import { SearchIcon } from "@/components/icons";

/** Universal search. Module 3 wires it to live suggestions; until then it is the box alone. */
export function SearchBox() {
  return (
    <label className="group flex h-12 w-full max-w-xl items-center gap-3 rounded-full border border-border bg-surface px-5 shadow-card transition focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/20">
      <SearchIcon className="size-5 shrink-0 text-muted transition group-focus-within:text-accent-ink" />
      <span className="sr-only">Search</span>
      <input
        type="search"
        placeholder="Search for people, teams or skills…"
        className="min-w-0 flex-1 bg-transparent text-[15px] placeholder:text-muted/80 focus:outline-none"
      />
      <kbd className="hidden rounded-lg bg-surface-muted px-2 py-1 font-sans text-xs font-semibold text-muted sm:block">Ctrl K</kbd>
    </label>
  );
}
