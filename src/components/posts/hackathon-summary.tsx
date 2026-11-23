"use client";

import { useState } from "react";
import type { HackathonPreview } from "@/lib/hackathon/extract";
import { formatDateRange, MODE_LABEL } from "@/lib/hackathon/format";

function ExternalIcon({ className = "size-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </svg>
  );
}

/** The few facts people ask first: when, where, what's the prize, how big a team. Only the ones the page gave us. */
export function keyFacts(p: HackathonPreview): { label: string; value: string }[] {
  const dates = formatDateRange(p.startsOn, p.endsOn) ?? p.datesText;
  const where = [p.mode ? MODE_LABEL[p.mode] : null, p.location].filter(Boolean).join(" · ");
  return [
    dates ? { label: "Dates", value: dates } : null,
    where ? { label: "Location", value: where } : null,
    p.prizes ? { label: "Prizes", value: p.prizes } : null,
    p.teamSize ? { label: "Team size", value: `${p.teamSize} members` } : null,
  ].filter((f): f is { label: string; value: string } => f !== null);
}

/**
 * "What the hackathon is about": a clean summary of the event page, for the post and for the composer's preview.
 * All text here came from an outside page and is only ever shown as plain text.
 */
export function HackathonSummary({ preview }: { preview: HackathonPreview }) {
  const [more, setMore] = useState(false);
  const facts = keyFacts(preview);
  const about = preview.about ?? preview.summary;
  const long = (about?.length ?? 0) > 420;

  return (
    <div className="space-y-4">
      {preview.name && <h4 className="text-lg font-bold leading-snug tracking-tight">{preview.name}</h4>}

      {facts.length > 0 && (
        <dl className="grid gap-2 sm:grid-cols-2">
          {facts.map((f) => (
            <div key={f.label} className="rounded-2xl bg-surface-muted px-3.5 py-2.5">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">{f.label}</dt>
              <dd className="mt-0.5 break-words text-sm font-semibold">{f.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {about && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">About</p>
          <div className={`mt-1 space-y-2 text-sm leading-relaxed ${long && !more ? "line-clamp-6" : ""}`}>
            {about.split(/\n{2,}/).map((para, i) => (
              <p key={i} className="whitespace-pre-line break-words">
                {para}
              </p>
            ))}
          </div>
          {long && (
            <button type="button" onClick={() => setMore((m) => !m)} className="mt-1.5 text-sm font-semibold text-accent-ink hover:underline">
              {more ? "Show less" : "Read more"}
            </button>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3">
        <p className="min-w-0 flex-1 text-xs text-muted">Summarised automatically from the event page. Check it for the latest details.</p>
        <a
          href={preview.url}
          target="_blank"
          rel="noopener noreferrer nofollow ugc"
          className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-xs font-bold text-accent-foreground"
        >
          Open event page <ExternalIcon />
        </a>
      </div>
    </div>
  );
}

export { ExternalIcon };
