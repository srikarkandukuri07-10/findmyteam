"use client";

import { useRouter } from "next/navigation";
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { swipePerson } from "@/app/(app)/discover/actions";
import type { DiscoverCandidate } from "@/lib/discover/data";
import {
  connectsLeftText,
  decideSwipe,
  swipeToast,
  type SwipeAction,
  type ToastTone,
} from "@/lib/discover/swipe-logic";
import { SwipeCard } from "./swipe-card";
import { Card } from "./ui";

type Props = {
  candidates: DiscoverCandidate[];
  connectsLeft: number;
  /** Open straight into the cards, skipping the intro (used when checking for more). */
  autoStart?: boolean;
};

type ToastItem = { id: number; tone: ToastTone; text: string };

const SPRING = { type: "spring", stiffness: 260, damping: 24 } as const;

function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);
  const push = useCallback((toast: { tone: ToastTone; text: string }) => {
    const id = ++nextId.current;
    setToasts((cur) => [...cur.slice(-2), { id, ...toast }]);
    window.setTimeout(() => setToasts((cur) => cur.filter((t) => t.id !== id)), 2800);
  }, []);
  return { toasts, push };
}

/** Notices slide in from the left and leave to the left. */
function ToastStack({ toasts }: { toasts: ToastItem[] }) {
  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-5 left-4 z-50 flex max-w-[calc(100vw-2rem)] flex-col gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, x: -56 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -72, transition: { duration: 0.28 } }}
            transition={{ type: "spring", stiffness: 340, damping: 28 }}
            className={`rounded-2xl border-l-4 bg-surface px-4 py-3 text-sm font-medium shadow-lift ${
              t.tone === "success" ? "border-accent" : t.tone === "info" ? "border-chip" : "border-danger"
            }`}
          >
            {t.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/** One card in the stack. Only the top card can be dragged; the ones behind peek out smaller. */
function CardShell({
  candidate,
  index,
  reduce,
  shakeKey,
  onCommit,
}: {
  candidate: DiscoverCandidate;
  index: number;
  reduce: boolean;
  shakeKey: number;
  onCommit: (action: SwipeAction) => void;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-240, 0, 240], reduce ? [0, 0, 0] : [-12, 0, 12]);
  const connectStamp = useTransform(x, [30, 130], [0, 1]);
  const skipStamp = useTransform(x, [-130, -30], [1, 0]);
  const isTop = index === 0;

  // A short side-to-side shake when a request is blocked by the daily limit.
  useEffect(() => {
    if (isTop && shakeKey > 0 && !reduce) animate(x, [0, -14, 14, -10, 10, 0], { duration: 0.45 });
  }, [isTop, shakeKey, reduce, x]);

  return (
    <motion.div
      className="absolute inset-0 select-none"
      style={{ x, rotate, zIndex: 10 - index, cursor: isTop ? "grab" : "default" }}
      drag={isTop ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      dragSnapToOrigin
      whileDrag={{ cursor: "grabbing" }}
      onDragEnd={(_, info) => {
        const decision = decideSwipe(info.offset.x, info.velocity.x);
        if (decision) onCommit(decision);
      }}
      initial={{ scale: 0.78, opacity: 0, y: 44 }}
      animate={{ scale: 1 - index * 0.05, y: index * 16, opacity: 1 - index * 0.2 }}
      exit="exit"
      variants={{
        exit: (direction: number) => ({
          x: reduce ? 0 : direction * 760,
          rotate: reduce ? 0 : direction * 18,
          opacity: 0,
          transition: { duration: 0.4, ease: [0.3, 0, 0.9, 0.6] },
        }),
      }}
      transition={SPRING}
    >
      <SwipeCard candidate={candidate} />
      {isTop && (
        <>
          <motion.span
            aria-hidden
            style={{ opacity: connectStamp }}
            className="pointer-events-none absolute left-5 top-5 -rotate-12 rounded-xl border-4 border-accent-ink px-3 py-1 text-lg font-bold tracking-widest text-accent-ink"
          >
            CONNECT
          </motion.span>
          <motion.span
            aria-hidden
            style={{ opacity: skipStamp }}
            className="pointer-events-none absolute right-5 top-5 rotate-12 rounded-xl border-4 border-muted px-3 py-1 text-lg font-bold tracking-widest text-muted"
          >
            SKIP
          </motion.span>
        </>
      )}
    </motion.div>
  );
}

function Intro({ onStart, reduce }: { onStart: () => void; reduce: boolean }) {
  return (
    <motion.div
      key="intro"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -70, scale: 0.96, transition: { duration: 0.3 } }}
      transition={SPRING}
    >
      <Card className="flex flex-col items-center gap-6 py-10 text-center sm:p-10">
        <div aria-hidden className="relative h-28 w-44">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="absolute inset-x-6 top-3 h-24 rounded-2xl bg-gradient-to-br from-accent-soft to-accent shadow-card"
              style={{ rotate: (i - 1) * 9, zIndex: i === 1 ? 2 : 1 }}
              animate={reduce ? undefined : { y: [0, -7, 0] }}
              transition={{ duration: 3.2, repeat: Infinity, delay: i * 0.35, ease: "easeInOut" }}
            />
          ))}
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">Find your teammates</h2>
          <p className="mx-auto max-w-xs text-sm text-muted">
            Swipe right to send a request, left to skip. Nothing is sent when you skip, and nobody is told.
          </p>
        </div>
        <motion.button
          type="button"
          onClick={onStart}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="rounded-full bg-accent px-8 py-3 text-sm font-semibold text-accent-foreground shadow-card"
        >
          Start discovering
        </motion.button>
      </Card>
    </motion.div>
  );
}

function AllCaughtUp({ onMore, empty }: { onMore: () => void; empty: boolean }) {
  return (
    <motion.div
      key="done"
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, x: -70, transition: { duration: 0.3 } }}
      transition={SPRING}
    >
      <Card className="flex flex-col items-center gap-4 py-12 text-center">
        <span aria-hidden className="grid size-14 place-items-center rounded-full bg-accent-soft text-2xl text-accent-ink">
          ✓
        </span>
        <h2 className="text-xl font-semibold tracking-tight">{empty ? "No one new to show yet" : "You're all caught up"}</h2>
        <p className="max-w-xs text-sm text-muted">
          {empty
            ? "Check back soon. New students join all the time."
            : "That's everyone for now. Check again to see if more students match."}
        </p>
        <motion.button
          type="button"
          onClick={onMore}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="rounded-full bg-chip px-6 py-2.5 text-sm font-semibold"
        >
          Check for more
        </motion.button>
      </Card>
    </motion.div>
  );
}

export function SwipeDeck({ candidates, connectsLeft, autoStart = false }: Props) {
  const reduce = useReducedMotion() ?? false;
  const router = useRouter();
  const [started, setStarted] = useState(autoStart);
  const [queue, setQueue] = useState(candidates);
  const [left, setLeft] = useState(connectsLeft);
  const [exitDir, setExitDir] = useState<1 | -1>(1);
  const [shake, setShake] = useState(0);
  const [, startTransition] = useTransition();
  const { toasts, push } = useToasts();

  const commit = useCallback(
    (action: SwipeAction) => {
      const card = queue[0];
      if (!card) return;

      if (action === "connect" && left <= 0) {
        push(swipeToast("limit", card.name));
        setShake((n) => n + 1);
        return;
      }

      // The card flies away right now; the database call happens in the background.
      setExitDir(action === "connect" ? 1 : -1);
      setQueue((q) => q.slice(1));
      if (action === "connect") setLeft((l) => Math.max(0, l - 1));

      startTransition(async () => {
        const { result } = await swipePerson(card.id, action);
        push(swipeToast(result, card.name));
        if (result === "limit") setLeft(0);
      });
    },
    [queue, left, push],
  );

  // Arrow keys do the same as the buttons.
  useEffect(() => {
    if (!started) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (event.key === "ArrowRight") commit("connect");
      else if (event.key === "ArrowLeft") commit("skip");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [started, commit]);

  const checkForMore = () => {
    router.replace("/discover?go=1");
    router.refresh();
  };

  const visible = queue.slice(0, 3);
  const showIntro = !started && candidates.length > 0;
  const showDone = (started || candidates.length === 0) && queue.length === 0;

  return (
    <div className="relative mx-auto w-full max-w-md">
      <AnimatePresence mode="wait" initial={false}>
        {showIntro ? (
          <Intro key="intro" onStart={() => setStarted(true)} reduce={reduce} />
        ) : showDone ? (
          <AllCaughtUp key="done" onMore={checkForMore} empty={candidates.length === 0} />
        ) : (
          <motion.div
            key="deck"
            initial={{ opacity: 0, scale: 0.55 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, x: -70, transition: { duration: 0.3 } }}
            transition={{ type: "spring", stiffness: 210, damping: 19 }}
          >
            <div className="mb-4 flex items-center justify-between text-sm">
              <span className="text-muted">{queue.length} to go</span>
              <motion.span
                key={left}
                initial={{ scale: 1.25 }}
                animate={{ scale: 1 }}
                transition={SPRING}
                className="rounded-full bg-surface px-3 py-1 font-medium shadow-card"
              >
                {connectsLeftText(left)}
              </motion.span>
            </div>

            <div className="relative h-[560px] sm:h-[540px]">
              <AnimatePresence custom={exitDir}>
                {[...visible]
                  .map((candidate, index) => ({ candidate, index }))
                  .reverse()
                  .map(({ candidate, index }) => (
                    <CardShell
                      key={candidate.id}
                      candidate={candidate}
                      index={index}
                      reduce={reduce}
                      shakeKey={shake}
                      onCommit={commit}
                    />
                  ))}
              </AnimatePresence>
            </div>

            <div className="mt-6 flex items-center justify-center gap-7">
              <motion.button
                type="button"
                aria-label="Skip"
                onClick={() => commit("skip")}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.86 }}
                className="grid size-16 place-items-center rounded-full bg-surface text-2xl text-muted shadow-card"
              >
                ✕
              </motion.button>
              <motion.button
                type="button"
                aria-label="Send request"
                onClick={() => commit("connect")}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.86 }}
                animate={{ opacity: left <= 0 ? 0.55 : 1 }}
                className="grid size-20 place-items-center rounded-full bg-accent text-3xl font-semibold text-accent-foreground shadow-lift"
              >
                ✓
              </motion.button>
            </div>
            <p className="mt-4 text-center text-xs text-muted">Drag the card, tap a button, or press ← and →</p>
          </motion.div>
        )}
      </AnimatePresence>

      <ToastStack toasts={toasts} />
    </div>
  );
}
