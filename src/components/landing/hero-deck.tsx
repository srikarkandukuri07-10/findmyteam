"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

/** Sample students for the demo deck (fictional). Same card design as the app's swipe deck. */
const DEMO = [
  { initials: "AR", name: "Ananya R.", line: "B.Tech · CSE · Year 3", reason: "UI/UX designer · pairs well with your developer", roles: ["UI/UX designer", "Frontend"], skills: ["Figma", "React"], bio: "Designs the screens judges remember.", action: "connect" },
  { initials: "RK", name: "Rohit K.", line: "B.Tech · ECE · Year 2", reason: "Also interested in HealthTech Sprint", roles: ["Hardware", "ML engineer"], skills: ["Python", "IoT"], bio: "Builds things with Arduino. Wants one win before graduating.", action: "skip" },
  { initials: "SM", name: "Sneha M.", line: "B.E. · IT · Year 4", reason: "Backend developer · pairs well with your designer", roles: ["Backend", "DevOps"], skills: ["Node.js", "Postgres"], bio: "Ships APIs at 3 AM. Looking for a designer.", action: "connect" },
  { initials: "VP", name: "Varun P.", line: "B.Tech · Mech · Year 3", reason: "From a college across town", roles: ["Pitch person", "Product"], skills: ["Pitching", "Research"], bio: "Has pitched to real investors. Needs builders.", action: "connect" },
] as const;

const FLOATING = [
  // Above the card and beside the buttons on phones; out to the sides where there is room.
  { label: "UI/UX designer", className: "-top-5 left-2 sm:-left-20 sm:top-12", delay: 0 },
  { label: "ML engineer", className: "-top-5 right-2 sm:-right-20 sm:top-32", delay: 0.8 },
  { label: "Backend dev", className: "bottom-3 left-0 sm:-left-24 sm:bottom-28", delay: 1.6 },
  { label: "Pitch person", className: "bottom-3 right-0 sm:-right-20 sm:bottom-14", delay: 2.4 },
];

/** A self-playing version of the swipe deck: right sends a request, left skips. */
export function HeroDeck() {
  const reduce = useReducedMotion() ?? false;
  const [i, setI] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  // Every 2.6 s the top card leaves; a right swipe also shows the "request sent" toast.
  useEffect(() => {
    if (reduce) return;
    let n = 0;
    let hide: number | undefined;
    const timer = window.setInterval(() => {
      const gone = DEMO[n % DEMO.length];
      n += 1;
      setI(n);
      if (gone.action === "connect") {
        setToast(`Request sent to ${gone.name.split(" ")[0]}`);
        window.clearTimeout(hide);
        hide = window.setTimeout(() => setToast(null), 1800);
      }
    }, 2600);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(hide);
    };
  }, [reduce]);

  const stack = [0, 1, 2].map((k) => ({ card: DEMO[(i + k) % DEMO.length], key: i + k, depth: k }));
  const leaving = DEMO[(i - 1 + DEMO.length) % DEMO.length];
  const exitX = leaving.action === "connect" ? 520 : -520;

  return (
    <div className="relative mx-auto mt-6 h-[400px] w-full max-w-[340px] sm:mt-0 sm:h-[420px]">
      {FLOATING.map((f) => (
        <motion.span
          key={f.label}
          aria-hidden
          className={`absolute z-20 rounded-full bg-surface px-3.5 py-1.5 text-xs font-semibold text-accent-ink shadow-lift ${f.className}`}
          animate={reduce ? undefined : { y: [0, -10, 0] }}
          transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut", delay: f.delay }}
        >
          {f.label}
        </motion.span>
      ))}

      <AnimatePresence initial={false}>
        {stack
          .slice()
          .reverse()
          .map(({ card, key, depth }) => (
            <motion.article
              key={key}
              aria-hidden={depth > 0}
              className="absolute inset-x-0 top-0 flex h-[330px] flex-col gap-3 rounded-3xl bg-surface p-5 shadow-lift sm:h-[350px]"
              style={{ zIndex: 10 - depth }}
              initial={{ scale: 0.86, y: 40, opacity: 0 }}
              animate={{ scale: 1 - depth * 0.05, y: depth * 14, opacity: 1 - depth * 0.25, x: 0, rotate: 0 }}
              exit={{ x: exitX, rotate: exitX > 0 ? 16 : -16, opacity: 0, transition: { duration: 0.45, ease: [0.3, 0, 0.9, 0.6] } }}
              transition={{ type: "spring", stiffness: 220, damping: 24 }}
            >
              <header className="flex items-center gap-3">
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-accent-soft to-accent font-semibold text-accent-foreground">
                  {card.initials}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{card.name}</p>
                  <p className="truncate text-xs text-muted">{card.line}</p>
                </div>
              </header>
              <p className="rounded-2xl bg-accent-soft px-3 py-2 text-xs font-medium text-accent-ink">{card.reason}</p>
              <ul className="flex flex-wrap gap-1.5">
                {card.roles.map((r) => (
                  <li key={r} className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent-ink">
                    {r}
                  </li>
                ))}
              </ul>
              <p className="text-sm leading-snug">{card.bio}</p>
              <ul className="flex flex-wrap gap-1.5">
                {card.skills.map((s) => (
                  <li key={s} className="rounded-full bg-sand px-2.5 py-1 text-xs font-medium">
                    {s}
                  </li>
                ))}
              </ul>
              <div className="mt-auto flex items-center justify-between border-t border-border pt-3 text-xs text-muted">
                <span className="rounded-full bg-chip px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground">
                  Sample profile
                </span>
                <span className="font-medium text-accent-ink">Full profile</span>
              </div>
              {depth === 0 && (
                <motion.span
                  key={`stamp-${key}`}
                  className={`absolute top-5 rounded-xl border-4 px-2.5 py-0.5 text-sm font-bold tracking-widest ${
                    card.action === "connect" ? "right-5 -rotate-12 border-accent-ink text-accent-ink" : "right-5 rotate-12 border-muted text-muted"
                  }`}
                  initial={{ opacity: 0, scale: 1.4 }}
                  animate={reduce ? { opacity: 0 } : { opacity: [0, 0, 1], scale: [1.4, 1.4, 1] }}
                  transition={{ duration: 2.3, times: [0, 0.8, 1] }}
                >
                  {card.action === "connect" ? "CONNECT" : "SKIP"}
                </motion.span>
              )}
            </motion.article>
          ))}
      </AnimatePresence>

      <div className="absolute inset-x-0 bottom-0 z-20 flex justify-center gap-5">
        <span aria-hidden className="grid size-12 place-items-center rounded-full bg-surface text-lg text-muted shadow-card">
          ✕
        </span>
        <span aria-hidden className="grid size-14 place-items-center rounded-full bg-accent text-xl font-semibold text-accent-foreground shadow-lift">
          ✓
        </span>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.p
            key={toast + i}
            className="absolute left-2 bottom-24 z-30 rounded-2xl border-l-4 border-accent bg-surface px-3.5 py-2 text-xs font-semibold shadow-lift sm:-left-10"
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
          >
            {toast}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
