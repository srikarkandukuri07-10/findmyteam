"use client";

import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { ArrowRightIcon, CheckIcon, CloseIcon } from "@/components/icons";
import type { DiscoverCandidate } from "@/lib/discover/data";
import { avatarSrc } from "@/lib/avatar";
import { connectsLeftText, SCOUT_BATCH } from "@/lib/discover/swipe-logic";
import { ScoutDeck } from "./scout-deck";

const noSubscribe = () => () => {};

/** A fan of three cards that breathes, with the first students' faces on it. */
function CardFan({ faces, reduce }: { faces: DiscoverCandidate[]; reduce: boolean }) {
  const slots = [
    { rotate: -14, x: -78, y: 18, delay: 0.1 },
    { rotate: 12, x: 78, y: 18, delay: 0.2 },
    { rotate: 0, x: 0, y: 0, delay: 0 },
  ];
  return (
    <div aria-hidden className="relative mx-auto h-[300px] w-[260px]">
      {slots.map((s, i) => {
        const c = faces[i];
        return (
          <motion.div
            key={i}
            className="absolute inset-x-6 top-4 h-[250px] overflow-hidden rounded-[1.75rem] bg-surface shadow-lift"
            initial={{ opacity: 0, scale: 0.6, rotate: 0, x: 0, y: 40 }}
            animate={
              reduce
                ? { opacity: 1, scale: 1, rotate: s.rotate, x: s.x, y: s.y }
                : {
                    opacity: 1,
                    scale: 1,
                    rotate: [s.rotate, s.rotate * 1.18, s.rotate],
                    x: s.x,
                    y: [s.y, s.y - 8, s.y],
                  }
            }
            transition={{
              opacity: { duration: 0.4, delay: s.delay },
              scale: { type: "spring", stiffness: 180, damping: 16, delay: s.delay },
              x: { type: "spring", stiffness: 180, damping: 18, delay: s.delay },
              rotate: { duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.8 + s.delay },
              y: { duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.8 + s.delay },
            }}
          >
            <div className="relative h-[62%] bg-gradient-to-br from-accent-soft to-[#b9a6e3]">
              {c && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarSrc(c.id, c.avatarPath, { transparent: true })}
                  alt=""
                  className="absolute inset-0 h-full w-full object-contain object-bottom pt-2"
                />
              )}
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#1f1b2e]/70 to-transparent" />
              <p className="absolute bottom-2 left-4 text-lg font-bold text-surface">
                {c ? c.name.split(" ")[0] : " "}
              </p>
            </div>
            <div className="space-y-2 p-4">
              <span className="block h-3 w-3/4 rounded-full bg-accent-soft" />
              <span className="block h-3 w-1/2 rounded-full bg-chip" />
              <span className="flex gap-1.5 pt-1">
                <span className="h-5 w-14 rounded-full bg-[#3b3163]/80" />
                <span className="h-5 w-12 rounded-full bg-sand" />
              </span>
            </div>
          </motion.div>
        );
      })}
      <motion.span
        className="absolute -left-2 top-28 grid size-12 place-items-center rounded-full bg-surface text-muted shadow-lift"
        animate={reduce ? undefined : { x: [0, -10, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      >
        <CloseIcon className="size-5" strokeWidth={2.4} />
      </motion.span>
      <motion.span
        className="absolute -right-2 top-28 grid size-14 place-items-center rounded-full bg-accent text-accent-foreground shadow-lift"
        animate={reduce ? undefined : { x: [0, 10, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
      >
        <CheckIcon className="size-6" strokeWidth={2.6} />
      </motion.span>
    </div>
  );
}

/** The Scout page: what it is, how many requests are left today, and the button that opens the deck. */
export function ScoutLauncher({
  candidates,
  connectsLeft,
  autoOpen,
}: {
  candidates: DiscoverCandidate[];
  connectsLeft: number;
  autoOpen: boolean;
}) {
  const reduce = useReducedMotion() ?? false;
  const router = useRouter();
  const [open, setOpen] = useState(autoOpen && candidates.length > 0);
  const [run, setRun] = useState(0);
  const portalReady = useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false,
  );

  // Drop ?go=1 when closing: refreshing with it still in the address re-opened the deck at once.
  const close = () => {
    setOpen(false);
    router.replace("/discover", { scroll: false });
  };

  return (
    <>
      <section className="reveal relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#2a2340] via-[#3b3163] to-[#66549f] text-surface shadow-lift">
        <div aria-hidden className="drift absolute -right-24 -top-24 size-96 rounded-full bg-accent/40 blur-3xl" />
        <div
          aria-hidden
          className="drift-slow absolute -bottom-24 left-10 size-80 rounded-full bg-accent-soft/15 blur-3xl"
        />
        <div className="relative grid items-center gap-8 p-7 sm:p-10 md:grid-cols-[1.1fr_1fr]">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-surface/15 px-4 py-1.5 text-sm font-semibold backdrop-blur">
              <span className="pulse-dot size-2 rounded-full bg-accent" />
              {candidates.length > 0
                ? `${candidates.length}${candidates.length >= SCOUT_BATCH ? "+" : ""} ${candidates.length === 1 ? "student" : "students"} ready for you`
                : "No new students right now"}
            </span>
            <h1 className="text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
              Meet your next
              <br />
              <span className="bg-gradient-to-r from-accent-soft to-accent bg-clip-text text-transparent">
                teammate.
              </span>
            </h1>
            <p className="max-w-md text-lg text-surface/80">
              One student at a time, from colleges across the city. Swipe right to send a team-up request, left to skip
              for now.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <motion.button
                type="button"
                onClick={() => {
                  setRun((r) => r + 1);
                  setOpen(true);
                }}
                disabled={candidates.length === 0}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.95 }}
                className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full bg-surface px-8 py-4 text-lg font-bold text-[#2a2340] shadow-lift disabled:opacity-60"
              >
                <span className="relative z-10">Start Scouting</span>
                <ArrowRightIcon className="relative z-10 size-5 transition-transform group-hover:translate-x-1" />
                <span aria-hidden className="button-shine absolute inset-0" />
              </motion.button>
              <span className="rounded-full bg-surface/10 px-4 py-2 text-sm font-medium">
                {connectsLeftText(connectsLeft)}
              </span>
            </div>
            {candidates.length === 0 && (
              <button
                type="button"
                onClick={() => router.refresh()}
                className="text-sm font-semibold text-accent-soft underline underline-offset-4"
              >
                Check again
              </button>
            )}
          </div>
          <CardFan faces={candidates.slice(0, 3)} reduce={reduce} />
        </div>
      </section>

      <ul className="stagger grid gap-4 sm:grid-cols-3">
        {[
          ["Swipe right", "Sends a team-up request. They'll see it in Requests."],
          ["Swipe left", "Skips for now. Nobody is told, and they can come back in a week."],
          ["Tap a card", "Flips it to show their full bio, every skill and GitHub."],
        ].map(([title, body]) => (
          <li key={title} className="reveal lift rounded-3xl bg-surface p-5 shadow-card">
            <p className="font-semibold">{title}</p>
            <p className="mt-1 text-sm text-muted">{body}</p>
          </li>
        ))}
      </ul>

      {portalReady &&
        createPortal(
          <AnimatePresence>
            {open && (
              <ScoutDeck
                key={run}
                candidates={candidates}
                connectsLeft={connectsLeft}
                onClose={close}
                onNeedMore={() => {
                  setOpen(false);
                  router.replace("/discover?go=1");
                  router.refresh();
                }}
              />
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
