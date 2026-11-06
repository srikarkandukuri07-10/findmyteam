"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState, useTransition } from "react";
import { connectFromProfile } from "@/app/(app)/(shell)/students/[id]/actions";
import { cancelMyRequest, respondToRequest } from "@/app/(app)/(shell)/requests/actions";
import { openChatWith } from "@/app/(app)/(shell)/messages/actions";
import { CheckIcon, CloseIcon, MessagesIcon, RequestsIcon } from "@/components/icons";
import type { ConnectionState } from "@/lib/profile/data";
import { swipeToast } from "@/lib/discover/swipe-logic";

/**
 * The button on another student's profile, LinkedIn-style: Connect → Pending (cancel),
 * Accept / Not now when they asked first, and Connected once accepted.
 */
export function ConnectButton({
  targetId,
  name,
  initial,
}: {
  targetId: string;
  name: string;
  initial: ConnectionState;
}) {
  const [conn, setConn] = useState(initial);
  const [note, setNote] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  const run = (optimistic: ConnectionState, work: () => Promise<ConnectionState | string>) => {
    const before = conn;
    setConn(optimistic);
    setNote(null);
    startTransition(async () => {
      const next = await work();
      if (typeof next === "string") {
        setConn(before);
        setNote(next);
      } else {
        setConn(next);
      }
    });
  };

  const connect = () =>
    run({ state: "sent", requestId: null }, async () => {
      const { result } = await connectFromProfile(targetId);
      if (result === "sent" || result === "already") return { state: "sent", requestId: null };
      return swipeToast(result, name).text;
    });

  const base =
    "inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold transition active:scale-95 disabled:opacity-70";

  return (
    <div className="flex flex-col items-end gap-2">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={conn.state}
          initial={{ opacity: 0, scale: 0.85, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: -6 }}
          transition={{ type: "spring", stiffness: 420, damping: 26 }}
          className="flex flex-wrap justify-end gap-2"
        >
          {conn.state === "none" && (
            <button
              type="button"
              onClick={connect}
              disabled={busy}
              className={`${base} bg-accent text-accent-foreground shadow-lift hover:-translate-y-0.5 hover:bg-accent-hover`}
            >
              <RequestsIcon className="size-4" /> Connect
            </button>
          )}
          {conn.state === "sent" && (
            <>
              <span className={`${base} bg-accent-soft text-accent-ink`}>
                <span className="pulse-dot size-2 rounded-full bg-accent-ink" /> Request sent
              </span>
              {conn.requestId && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    run({ state: "none", requestId: null }, async () => {
                      const { ok } = await cancelMyRequest(conn.requestId as string);
                      return ok ? { state: "none", requestId: null } : "Couldn't cancel. Try again.";
                    })
                  }
                  className={`${base} text-muted hover:bg-surface-muted`}
                >
                  Cancel
                </button>
              )}
            </>
          )}
          {conn.state === "received" && conn.requestId && (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  run({ state: "none", requestId: null }, async () => {
                    const { ok } = await respondToRequest(conn.requestId as string, false);
                    return ok ? { state: "none", requestId: null } : "Couldn't update. Try again.";
                  })
                }
                className={`${base} bg-chip hover:bg-accent-soft`}
              >
                <CloseIcon className="size-4" /> Not now
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  run({ state: "connected", requestId: conn.requestId }, async () => {
                    const { ok } = await respondToRequest(conn.requestId as string, true);
                    return ok ? { state: "connected", requestId: conn.requestId } : "Couldn't accept. Try again.";
                  })
                }
                className={`${base} bg-accent text-accent-foreground shadow-lift hover:bg-accent-hover`}
              >
                <CheckIcon className="size-4" /> Accept request
              </button>
            </>
          )}
          {conn.state === "connected" && (
            <>
              <span className={`${base} bg-success-soft text-success`}>
                <CheckIcon className="size-4" /> Connected
              </span>
              <form action={openChatWith.bind(null, targetId)}>
                <button
                  type="submit"
                  className={`${base} bg-accent text-accent-foreground shadow-lift hover:-translate-y-0.5 hover:bg-accent-hover`}
                >
                  <MessagesIcon className="size-4" /> Message
                </button>
              </form>
            </>
          )}
        </motion.div>
      </AnimatePresence>
      {conn.state === "received" && (
        <p className="text-xs text-muted">{name.split(" ")[0]} wants to team up with you.</p>
      )}
      <AnimatePresence>
        {note && (
          <motion.p
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            role="alert"
            className="max-w-64 text-right text-xs font-medium text-danger"
          >
            {note}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
