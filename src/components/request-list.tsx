"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useState, useTransition } from "react";
import { cancelMyRequest, respondToRequest } from "@/app/(app)/requests/actions";
import type { RequestDirection, RequestItem } from "@/lib/requests/data";
import { timeAgo } from "@/lib/time";
import { initials } from "@/lib/validation/profile";
import { Chip } from "./ui";

const SPRING = { type: "spring", stiffness: 300, damping: 28 } as const;

function statusChip(item: RequestItem, direction: RequestDirection) {
  switch (item.status) {
    case "accepted":
      return <Chip tone="success">Accepted</Chip>;
    case "rejected":
      // Senders see a neutral message, never a blunt "declined".
      return direction === "sent" ? <Chip>Not a match right now</Chip> : <Chip>Declined</Chip>;
    case "cancelled":
      return <Chip>Cancelled</Chip>;
    case "expired":
      return <Chip>Expired</Chip>;
    default:
      return <Chip tone="accent">Pending</Chip>;
  }
}

export function RequestList({ items, direction }: { items: RequestItem[]; direction: RequestDirection }) {
  const [rows, setRows] = useState(items);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  const act = (item: RequestItem, kind: "accept" | "decline" | "cancel") => {
    setMessage(null);
    const previous = rows;
    if (kind === "accept") {
      setRows((r) => r.map((x) => (x.id === item.id ? { ...x, status: "accepted" } : x)));
    } else {
      setRows((r) => r.filter((x) => x.id !== item.id));
    }
    startTransition(async () => {
      const { ok } =
        kind === "cancel" ? await cancelMyRequest(item.id) : await respondToRequest(item.id, kind === "accept");
      if (!ok) {
        setRows(previous);
        setMessage("That did not go through. Please try again.");
      }
    });
  };

  return (
    <div className="space-y-3">
      <AnimatePresence initial={false}>
        {message && (
          <motion.p
            key="msg"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            role="alert"
            className="rounded-2xl bg-danger-soft px-4 py-2.5 text-sm text-danger"
          >
            {message}
          </motion.p>
        )}
      </AnimatePresence>

      <ul className="space-y-3">
        <AnimatePresence initial>
          {rows.map((item, i) => (
            <motion.li
              key={item.id}
              layout
              initial={{ opacity: 0, x: -36 }}
              animate={{ opacity: 1, x: 0, transition: { ...SPRING, delay: Math.min(i, 8) * 0.05 } }}
              exit={{ opacity: 0, x: -90, transition: { duration: 0.3 } }}
              className="flex flex-wrap items-center gap-4 rounded-3xl bg-surface p-5 shadow-card"
            >
              <span
                aria-hidden
                className="grid size-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-accent-soft to-accent font-semibold text-accent-foreground"
              >
                {initials(item.name)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/students/${item.otherId}`}
                    className="truncate font-semibold hover:text-accent-ink hover:underline"
                  >
                    {item.name}
                  </Link>
                  {item.isDemo && <Chip>Sample</Chip>}
                </div>
                <p className="truncate text-sm text-muted">
                  {[item.branch, item.college, `Year ${item.year}`].filter(Boolean).join(" · ")}
                </p>
                {item.roles.length > 0 && (
                  <p className="mt-1 truncate text-xs text-muted">{item.roles.map((r) => r.name).join(", ")}</p>
                )}
                <p className="mt-1 text-xs text-muted">{timeAgo(item.createdAt)}</p>
              </div>

              <div className="flex items-center gap-2">
                {item.status !== "pending" ? (
                  statusChip(item, direction)
                ) : direction === "received" ? (
                  <>
                    <motion.button
                      type="button"
                      disabled={busy}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.93 }}
                      onClick={() => act(item, "decline")}
                      className="rounded-full bg-chip px-4 py-2 text-sm font-semibold"
                    >
                      Not now
                    </motion.button>
                    <motion.button
                      type="button"
                      disabled={busy}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.93 }}
                      onClick={() => act(item, "accept")}
                      className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
                    >
                      Accept
                    </motion.button>
                  </>
                ) : (
                  <>
                    {statusChip(item, direction)}
                    <motion.button
                      type="button"
                      disabled={busy}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.93 }}
                      onClick={() => act(item, "cancel")}
                      className="rounded-full px-3 py-2 text-sm font-medium text-muted hover:bg-surface-muted"
                    >
                      Cancel
                    </motion.button>
                  </>
                )}
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}
