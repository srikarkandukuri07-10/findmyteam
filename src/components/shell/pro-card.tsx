import Link from "next/link";

/** The small "Go Pro" card at the bottom of the sidebar. */
export function ProCard() {
  return (
    <Link
      href="/plans"
      className="group relative block overflow-hidden rounded-3xl bg-gradient-to-br from-accent-soft via-surface to-accent-soft p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-lift"
    >
      <svg viewBox="0 0 64 64" aria-hidden className="float-slow mb-2 size-10">
        <defs>
          <linearGradient id="rocket-body" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#c9b8ec" />
            <stop offset="1" stopColor="#66549f" />
          </linearGradient>
        </defs>
        <path d="M40 8c8 0 16 8 16 16 0 9-9 19-18 24l-6-6-6-6c5-9 15-28 14-28z" fill="url(#rocket-body)" />
        <circle cx="42" cy="22" r="4.5" fill="#f6f4e8" />
        <path d="M22 30l-10 2 6-10 10-2zM34 42l-2 10 10-6 2-10z" fill="#a18ccd" />
        <path d="M18 40c-4 2-6 8-6 12 4 0 10-2 12-6z" fill="#e9b949" />
      </svg>
      <p className="text-lg font-bold leading-tight tracking-tight">Build bigger. Together.</p>
      <p className="mt-1 text-sm text-muted">Pitch your hackathon project to investors with Pro.</p>
      <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-bold text-accent-foreground transition group-hover:gap-2.5">
        See plans <span aria-hidden>→</span>
      </span>
    </Link>
  );
}
