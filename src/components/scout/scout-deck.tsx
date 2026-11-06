"use client";

import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from "motion/react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { swipePerson } from "@/app/(app)/(shell)/discover/actions";
import { CheckIcon, CloseIcon } from "@/components/icons";
import type { DiscoverCandidate } from "@/lib/discover/data";
import {
  connectsLeftText,
  decideSwipe,
  firstName,
  swipeToast,
  type SwipeAction,
  type ToastTone,
} from "@/lib/discover/swipe-logic";
import { ScoutCardBack, ScoutCardFront } from "./scout-card";

type Toast = { id: number; tone: ToastTone; text: string };
type Burst = { id: number; dir: 1 | -1 };

const SPRING = { type: "spring", stiffness: 260, damping: 24 } as const;

/** Little sparks that fly out from the card's edge on a swipe. */
function SwipeBurst({ dir }: { dir: 1 | -1 }) {
  const sparks = Array.from({ length: 14 }, (_, i) => {
    const angle = (dir === 1 ? -Math.PI / 2 : Math.PI / 2) + ((i - 6.5) / 6.5) * (Math.PI / 2.2);
    const dist = 90 + (i % 4) * 28;
    return { x: Math.cos(angle) * dist * dir * -1, y: Math.sin(angle) * dist, s: 6 + (i % 3) * 4, d: (i % 5) * 0.02 };
  });
  return (
    <div aria-hidden className={`pointer-events-none absolute top-1/2 z-40 ${dir === 1 ? "right-0" : "left-0"}`}>
      {sparks.map((p, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full"
          style={{
            width: p.s,
            height: p.s,
            background: dir === 1 ? (i % 2 ? "#a18ccd" : "#f6f4e8") : i % 2 ? "#8a8494" : "#d2cdd2",
          }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 0.4 }}
          animate={{ x: p.x, y: p.y, opacity: 0, scale: 1.2 }}
          transition={{ duration: 0.75, ease: "easeOut", delay: p.d }}
        />
      ))}
    </div>
  );
}

function TopCard({
  c,
  glow,
  reduce,
  flipped,
  shakeKey,
  onCommit,
  onFlip,
}: {
  c: DiscoverCandidate;
  glow: MotionValue<number>;
  reduce: boolean;
  flipped: boolean;
  shakeKey: number;
  onCommit: (a: SwipeAction) => void;
  onFlip: () => void;
}) {
  // Each card has its own drag position; the deck's side glows follow it through `glow`.
  const x = useMotionValue(0);
  useMotionValueEvent(x, "change", (v) => glow.set(v));
  useEffect(() => () => glow.set(0), [glow]);
  const rotate = useTransform(x, [-300, 0, 300], reduce ? [0, 0, 0] : [-16, 0, 16]);
  const lift = useTransform(x, [-300, 0, 300], [-10, 0, -10]);
  const connectOpacity = useTransform(x, [30, 140], [0, 1]);
  const skipOpacity = useTransform(x, [-140, -30], [1, 0]);
  const connectScale = useTransform(x, [30, 160], [0.7, 1.08]);
  const skipScale = useTransform(x, [-160, -30], [1.08, 0.7]);
  const dragStart = useRef(0);

  useEffect(() => {
    if (shakeKey > 0 && !reduce) animate(x, [0, -18, 18, -12, 12, -5, 0], { duration: 0.5 });
  }, [shakeKey, reduce, x]);

  return (
    <motion.div
      className="absolute inset-0 z-30 cursor-grab touch-none select-none active:cursor-grabbing"
      style={{ x, rotate, y: lift, perspective: 1600 }}
      drag={flipped ? false : "x"}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.95}
      dragSnapToOrigin
      onDragStart={() => {
        dragStart.current = Date.now();
      }}
      onDragEnd={(_, info) => {
        const decision = decideSwipe(info.offset.x, info.velocity.x);
        if (decision) onCommit(decision);
      }}
      onTap={() => {
        // A tap (not the end of a drag) flips the card.
        if (Date.now() - dragStart.current > 250) onFlip();
      }}
      initial={{ scale: 0.9, y: 26, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit="fly"
      variants={{
        fly: (dir: number) => ({
          x: reduce ? 0 : dir * 900,
          rotate: reduce ? 0 : dir * 28,
          opacity: 0,
          transition: { duration: 0.5, ease: [0.3, 0, 0.8, 0.5] },
        }),
      }}
      transition={SPRING}
    >
      <motion.div
        className="relative h-full w-full [transform-style:preserve-3d]"
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 200, damping: 22 }}
      >
        <div className="absolute inset-0 [backface-visibility:hidden]">
          <ScoutCardFront c={c} />
        </div>
        <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <ScoutCardBack c={c} />
        </div>
      </motion.div>

      <motion.span
        aria-hidden
        style={{ opacity: connectOpacity, scale: connectScale }}
        className="pointer-events-none absolute left-6 top-8 -rotate-12 rounded-2xl border-[5px] border-accent bg-[#1f1b2e]/30 px-4 py-1.5 text-2xl font-black tracking-[0.2em] text-surface backdrop-blur-sm"
      >
        CONNECT
      </motion.span>
      <motion.span
        aria-hidden
        style={{ opacity: skipOpacity, scale: skipScale }}
        className="pointer-events-none absolute right-6 top-8 rotate-12 rounded-2xl border-[5px] border-surface/80 bg-[#1f1b2e]/30 px-4 py-1.5 text-2xl font-black tracking-[0.2em] text-surface backdrop-blur-sm"
      >
        SKIP
      </motion.span>
    </motion.div>
  );
}

/**
 * DISC-1, DISC-3: the Scout deck, shown full screen. Right (drag, ✓ or →) sends a team-up request;
 * left (drag, ✕ or ←) skips for now: nobody is told, and a skipped student can come back after 7 days
 * (or again in this session, from the end screen). ⓘ, a tap or ↑ flips the card for details; Esc closes.
 */
export function ScoutDeck({
  candidates,
  connectsLeft,
  onClose,
  onNeedMore,
}: {
  candidates: DiscoverCandidate[];
  connectsLeft: number;
  onClose: () => void;
  onNeedMore: () => void;
}) {
  const reduce = useReducedMotion() ?? false;
  const [queue, setQueue] = useState(candidates);
  const [skipped, setSkipped] = useState<DiscoverCandidate[]>([]);
  const [left, setLeft] = useState(connectsLeft);
  const [exitDir, setExitDir] = useState<1 | -1>(1);
  const [flipped, setFlipped] = useState(false);
  const [shake, setShake] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [sentCount, setSentCount] = useState(0);
  const [, startTransition] = useTransition();
  const ids = useRef(0);
  const x = useMotionValue(0);
  // The side glows brighten as the card is dragged toward them.
  const rightGlow = useTransform(x, [0, 220], [0, 1]);
  const leftGlow = useTransform(x, [-220, 0], [1, 0]);

  const toast = useCallback((t: { tone: ToastTone; text: string }) => {
    const id = ++ids.current;
    setToasts((cur) => [...cur.slice(-2), { id, ...t }]);
    window.setTimeout(() => setToasts((cur) => cur.filter((x2) => x2.id !== id)), 2600);
  }, []);

  const commit = useCallback(
    (action: SwipeAction) => {
      const card = queue[0];
      if (!card) return;
      if (action === "connect" && left <= 0) {
        toast(swipeToast("limit", card.name));
        setShake((n) => n + 1);
        return;
      }
      const dir = action === "connect" ? 1 : -1;
      setExitDir(dir);
      setFlipped(false);
      setQueue((q) => q.slice(1));
      const burst = ++ids.current;
      setBursts((b) => [...b, { id: burst, dir }]);
      window.setTimeout(() => setBursts((b) => b.filter((y) => y.id !== burst)), 900);
      if (action === "connect") {
        setLeft((l) => Math.max(0, l - 1));
        setSentCount((n) => n + 1);
      } else {
        setSkipped((s) => [...s, card]);
      }

      startTransition(async () => {
        const { result } = await swipePerson(card.id, action);
        if (result === "skipped") toast({ tone: "info", text: `Skipped ${firstName(card.name)} for now` });
        else toast(swipeToast(result, card.name));
        if (result === "limit") setLeft(0);
      });
    },
    [queue, left, toast],
  );

  const reviewSkipped = () => {
    setQueue(skipped);
    setSkipped([]);
  };

  // Keyboard, and no page scrolling behind the deck.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") commit("connect");
      else if (e.key === "ArrowLeft") commit("skip");
      else if (e.key === "ArrowUp" || e.key.toLowerCase() === "i") setFlipped((f) => !f);
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [commit, onClose]);

  const top = queue[0];
  const behind = queue.slice(1, 3);

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Scout"
      className="fixed inset-0 z-[60] flex flex-col overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.3, delay: 0.1 } }}
    >
      {/* Backdrop */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#4a3f6b_0%,#2a2340_45%,#17131f_100%)]"
      />
      <div aria-hidden className="drift absolute -left-32 top-1/4 size-[420px] rounded-full bg-accent/25 blur-3xl" />
      <div
        aria-hidden
        className="drift-slow absolute -right-24 bottom-0 size-[380px] rounded-full bg-[#66549f]/35 blur-3xl"
      />
      <motion.div
        aria-hidden
        style={{ opacity: rightGlow }}
        className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-accent/45 to-transparent"
      />
      <motion.div
        aria-hidden
        style={{ opacity: leftGlow }}
        className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-[#8a8494]/40 to-transparent"
      />

      {/* Header */}
      <motion.header
        className="relative z-10 flex items-center justify-between gap-3 px-5 pt-5 text-surface sm:px-8"
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ...SPRING, delay: 0.15 }}
      >
        <div>
          <p className="text-2xl font-bold tracking-tight">Scout</p>
          <p className="text-sm text-surface/70">
            {top ? `${queue.length} ${queue.length === 1 ? "student" : "students"} to go` : "That's everyone for now"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <motion.span
            key={left}
            initial={{ scale: 1.35 }}
            animate={{ scale: 1 }}
            transition={SPRING}
            className="hidden rounded-full bg-surface/15 px-4 py-2 text-sm font-semibold backdrop-blur sm:block"
          >
            {connectsLeftText(left)}
          </motion.span>
          <motion.button
            type="button"
            onClick={onClose}
            aria-label="Close Scout"
            whileHover={{ rotate: 90, scale: 1.08 }}
            whileTap={{ scale: 0.9 }}
            className="grid size-11 place-items-center rounded-full bg-surface/15 backdrop-blur transition hover:bg-surface/25"
          >
            <CloseIcon className="size-5" />
          </motion.button>
        </div>
      </motion.header>

      {/* Deck */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-4">
        <motion.div
          className="relative h-[min(600px,calc(100dvh-250px))] w-[min(370px,calc(100vw-40px))]"
          initial={reduce ? { opacity: 0 } : { scale: 0.35, rotate: -10, opacity: 0, y: 60 }}
          animate={{ scale: 1, rotate: 0, opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 170, damping: 17, delay: 0.05 }}
        >
          {/* Cards waiting behind */}
          {behind
            .slice()
            .reverse()
            .map((c) => {
              const depth = behind.indexOf(c) + 1;
              return (
                <motion.div
                  key={c.id}
                  className="pointer-events-none absolute inset-0"
                  style={{ zIndex: 30 - depth }}
                  initial={{ scale: 0.8, y: 50, opacity: 0 }}
                  animate={{
                    scale: 1 - depth * 0.05,
                    y: depth * 12,
                    opacity: 1 - depth * 0.3,
                    rotate: depth === 1 ? -3 : 3,
                  }}
                  transition={SPRING}
                >
                  <ScoutCardFront c={c} />
                </motion.div>
              );
            })}

          <AnimatePresence custom={exitDir}>
            {top && (
              <TopCard
                key={top.id}
                c={top}
                glow={x}
                reduce={reduce}
                flipped={flipped}
                shakeKey={shake}
                onCommit={commit}
                onFlip={() => setFlipped((f) => !f)}
              />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {bursts.map((b) => (
              <SwipeBurst key={b.id} dir={b.dir} />
            ))}
          </AnimatePresence>

          {/* All caught up */}
          <AnimatePresence>
            {!top && (
              <motion.div
                key="done"
                initial={{ scale: 0.7, opacity: 0, rotate: -4 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ ...SPRING, delay: 0.25 }}
                className="absolute inset-0 flex flex-col items-center justify-center gap-5 rounded-[2rem] bg-surface p-8 text-center shadow-lift"
              >
                <motion.span
                  className="grid size-20 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground shadow-lift"
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.25, 1] }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                >
                  <CheckIcon className="size-10" strokeWidth={2.6} />
                </motion.span>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold tracking-tight">You&apos;re all caught up</h2>
                  <p className="text-muted">
                    {sentCount > 0
                      ? `You sent ${sentCount} team-up ${sentCount === 1 ? "request" : "requests"}. You'll find answers in Requests.`
                      : "New students join every day. Check back soon."}
                  </p>
                </div>
                <div className="flex w-full flex-col gap-2">
                  {skipped.length > 0 && (
                    <button
                      type="button"
                      onClick={reviewSkipped}
                      className="rounded-full bg-accent px-5 py-3 font-bold text-accent-foreground transition hover:bg-accent-hover active:scale-95"
                    >
                      Look at the {skipped.length} you skipped again
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onNeedMore}
                    className="rounded-full bg-chip px-5 py-3 font-semibold transition hover:bg-accent-soft active:scale-95"
                  >
                    Check for new students
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="py-2 text-sm font-medium text-muted hover:text-foreground"
                  >
                    Close Scout
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Controls */}
      <AnimatePresence>
        {top && (
          <motion.div
            className="relative z-10 flex items-center justify-center gap-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ ...SPRING, delay: 0.2 }}
          >
            <motion.button
              type="button"
              aria-label="Skip for now"
              onClick={() => commit("skip")}
              whileHover={{ scale: 1.1, rotate: -8 }}
              whileTap={{ scale: 0.85 }}
              className="grid size-16 place-items-center rounded-full bg-surface text-muted shadow-lift"
            >
              <CloseIcon className="size-7" strokeWidth={2.4} />
            </motion.button>
            <motion.button
              type="button"
              aria-label="Show details"
              aria-pressed={flipped}
              onClick={() => setFlipped((f) => !f)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.85 }}
              animate={{ rotateY: flipped ? 180 : 0 }}
              className="grid size-12 place-items-center rounded-full bg-surface/20 text-lg font-bold text-surface backdrop-blur"
            >
              i
            </motion.button>
            <motion.button
              type="button"
              aria-label="Send team-up request"
              onClick={() => commit("connect")}
              whileHover={{ scale: 1.1, rotate: 8 }}
              whileTap={{ scale: 0.85 }}
              animate={{ opacity: left <= 0 ? 0.55 : 1 }}
              className="relative grid size-20 place-items-center rounded-full bg-accent text-accent-foreground shadow-[0_18px_40px_-12px_rgb(161_140_205/0.8)]"
            >
              <span aria-hidden className="pulse-dot absolute inset-0 rounded-full" />
              <CheckIcon className="relative size-9" strokeWidth={2.6} />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
      <p className="relative z-10 hidden pb-4 text-center text-xs text-surface/55 sm:block">
        Drag the card, or use ← skip · → connect · ↑ details · Esc close
      </p>

      {/* Toasts slide in from the left */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-6 left-4 z-[70] flex max-w-[calc(100vw-2rem)] flex-col gap-2"
      >
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: -70 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -90, transition: { duration: 0.25 } }}
              transition={{ type: "spring", stiffness: 340, damping: 28 }}
              className={`rounded-2xl border-l-4 bg-surface px-4 py-3 text-sm font-semibold shadow-lift ${
                t.tone === "success" ? "border-accent" : t.tone === "info" ? "border-chip" : "border-danger"
              }`}
            >
              {t.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
