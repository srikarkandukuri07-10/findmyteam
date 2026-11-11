"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useState, useTransition } from "react";
import {
  completeTeam,
  decideRequest,
  leaveTeam,
  removeMember,
  requestToJoin,
  setRecruiting,
  withdrawRequest,
  type ActionResult,
} from "@/app/(app)/(shell)/teams/actions";
import { StudentAvatar } from "@/components/student-avatar";
import { CheckIcon, CloseIcon } from "@/components/icons";
import { buttonStyles } from "@/components/ui";
import { JOIN_NOTE_MAX } from "@/lib/validation/teams";

type RequestStatus = "pending" | "accepted" | "declined" | "withdrawn" | null;

function useAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<ActionResult>, after?: () => void) => {
    setError(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) setError(r.error);
      else {
        after?.();
        router.refresh();
      }
    });
  };
  return { pending, error, run };
}

function ErrorLine({ error }: { error: string | null }) {
  return (
    <AnimatePresence>
      {error && (
        <motion.p
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          role="alert"
          className="text-sm font-medium text-danger"
        >
          {error}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

/** D29: ask to join a team, with an optional note for the lead. Shows where the request stands. */
export function JoinButton({
  teamId,
  myRequest,
  isDemo,
  canJoin,
  compact = false,
}: {
  teamId: string;
  myRequest: RequestStatus;
  isDemo: boolean;
  canJoin: boolean;
  compact?: boolean;
}) {
  const { pending, error, run } = useAction();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");

  if (myRequest === "pending") {
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-4 py-2 text-sm font-semibold text-accent-ink">
            <span className="pulse-dot size-2 rounded-full bg-accent-ink" />
            Request sent · waiting for the lead
          </span>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => withdrawRequest(teamId))}
            className="rounded-full px-3 py-2 text-sm font-semibold text-muted hover:bg-surface-muted hover:text-foreground disabled:opacity-60"
          >
            {pending ? "Withdrawing…" : "Withdraw"}
          </button>
        </div>
        <ErrorLine error={error} />
      </div>
    );
  }
  if (isDemo) {
    return <span className="inline-block rounded-full bg-chip px-4 py-2 text-sm font-medium text-muted">Sample team</span>;
  }
  if (!canJoin) {
    return (
      <span className="inline-block rounded-full bg-chip px-4 py-2 text-sm font-medium text-muted">
        Not taking requests
      </span>
    );
  }

  return (
    <div className={`space-y-2 ${open ? "w-full" : ""}`}>
      <AnimatePresence initial={false} mode="wait">
        {open ? (
          <motion.form
            key="form"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            onSubmit={(e) => {
              e.preventDefault();
              run(() => requestToJoin(teamId, note), () => setOpen(false));
            }}
            className="space-y-2"
          >
            <textarea
              autoFocus
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={JOIN_NOTE_MAX}
              rows={compact ? 2 : 3}
              placeholder="Tell the lead what you'd bring (optional)"
              aria-label="Note to the team lead"
              className="block w-full resize-none rounded-2xl border border-border bg-surface-muted px-3.5 py-2.5 text-sm placeholder:text-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
            />
            <div className="flex flex-wrap items-center gap-2">
              <button type="submit" disabled={pending} className={`${buttonStyles.primary} disabled:opacity-60`}>
                {pending ? "Sending…" : "Send request"}
              </button>
              <button type="button" onClick={() => setOpen(false)} className={buttonStyles.ghost}>
                Cancel
              </button>
            </div>
          </motion.form>
        ) : (
          <motion.div key="button" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button type="button" onClick={() => setOpen(true)} className={buttonStyles.primary}>
              Request to join
            </button>
            {myRequest === "declined" && (
              <p className="mt-2 text-xs text-muted">Your last request here was declined.</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <ErrorLine error={error} />
    </div>
  );
}

export type RequestView = {
  id: string;
  userId: string;
  name: string;
  avatarPath: string | null;
  detail: string;
  note: string | null;
  when: string;
};

/** Who asked to join. The lead accepts or declines; teammates can see the list. */
export function RequestsPanel({
  teamId,
  requests,
  isOwner,
  leadName,
  full,
}: {
  teamId: string;
  requests: RequestView[];
  isOwner: boolean;
  leadName: string;
  full: boolean;
}) {
  const { pending, error, run } = useAction();
  const [busyId, setBusyId] = useState<string | null>(null);

  if (requests.length === 0) {
    return (
      <p className="rounded-2xl bg-surface-muted p-4 text-sm text-muted">
        No requests waiting. {isOwner ? "When someone asks to join, they'll show up here." : ""}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {isOwner && full && (
        <p className="rounded-2xl bg-sand p-3 text-sm">The team is full. Remove someone to accept another request.</p>
      )}
      <ul className="space-y-3">
        <AnimatePresence initial={false}>
          {requests.map((r) => (
            <motion.li
              key={r.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 30 }}
              className="rounded-2xl bg-surface-muted p-3 sm:p-4"
            >
              <div className="flex flex-wrap items-center gap-3">
                <Link href={`/students/${r.userId}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <StudentAvatar id={r.userId} name={r.name} avatarPath={r.avatarPath} size="sm" className="size-11" />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold hover:underline">{r.name}</span>
                    <span className="block truncate text-xs text-muted">
                      {[r.detail, r.when].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                </Link>
                {isOwner ? (
                  <span className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        setBusyId(r.id);
                        run(() => decideRequest(teamId, r.id, false));
                      }}
                      aria-label={`Decline ${r.name}`}
                      className="grid size-10 place-items-center rounded-full bg-surface text-muted shadow-card hover:text-danger disabled:opacity-60"
                    >
                      <CloseIcon className="size-4" strokeWidth={2.4} />
                    </button>
                    <button
                      type="button"
                      disabled={pending || full}
                      onClick={() => {
                        setBusyId(r.id);
                        run(() => decideRequest(teamId, r.id, true));
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-bold text-accent-foreground shadow-card disabled:opacity-50"
                    >
                      <CheckIcon className="size-4" strokeWidth={2.6} />
                      {pending && busyId === r.id ? "…" : "Accept"}
                    </button>
                  </span>
                ) : (
                  <span className="shrink-0 text-xs text-muted">Waiting for {leadName}</span>
                )}
              </div>
              {r.note && <p className="mt-2 rounded-xl bg-surface px-3 py-2 text-sm">“{r.note}”</p>}
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      <ErrorLine error={error} />
    </div>
  );
}

export function RemoveMemberButton({ teamId, userId, name }: { teamId: string; userId: string; name: string }) {
  const { pending, error, run } = useAction();
  return (
    <span className="flex flex-col items-end">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (window.confirm(`Remove ${name} from the team? They'll also leave the team chat.`)) {
            run(() => removeMember(teamId, userId));
          }
        }}
        className="rounded-full px-3 py-1.5 text-xs font-semibold text-muted hover:bg-danger-soft hover:text-danger disabled:opacity-60"
      >
        {pending ? "Removing…" : "Remove"}
      </button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </span>
  );
}

/** Lead-only: stop or restart taking requests, and mark the team completed. */
export function LeadActions({ teamId, recruiting, canReopen }: { teamId: string; recruiting: boolean; canReopen: boolean }) {
  const { pending, error, run } = useAction();
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {recruiting ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => setRecruiting(teamId, false))}
            className={`${buttonStyles.secondary} disabled:opacity-60`}
          >
            Stop taking requests
          </button>
        ) : (
          canReopen && (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => setRecruiting(teamId, true))}
              className={`${buttonStyles.secondary} disabled:opacity-60`}
            >
              Start taking requests
            </button>
          )
        )}
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (
              window.confirm(
                "Mark this team as completed? It stops taking requests and frees one of your 3 active team slots. The team chat stays.",
              )
            ) {
              run(() => completeTeam(teamId));
            }
          }}
          className={`${buttonStyles.ghost} disabled:opacity-60`}
        >
          Mark as completed
        </button>
      </div>
      <ErrorLine error={error} />
    </div>
  );
}

export function LeaveTeamButton({ teamId }: { teamId: string }) {
  const { pending, error, run } = useAction();
  const router = useRouter();
  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (window.confirm("Leave this team? You'll also leave the team chat.")) {
            run(() => leaveTeam(teamId), () => router.push("/teams"));
          }
        }}
        className="rounded-full px-4 py-2 text-sm font-semibold text-danger hover:bg-danger-soft disabled:opacity-60"
      >
        {pending ? "Leaving…" : "Leave team"}
      </button>
      <ErrorLine error={error} />
    </div>
  );
}
