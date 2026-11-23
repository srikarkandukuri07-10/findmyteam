import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import { StudentAvatar } from "@/components/student-avatar";
import { getCollegePeers } from "@/lib/college/data";
import { getShellInfo } from "@/lib/shell/data";
import { QuickConnectButton } from "@/components/quick-connect-button";

/** Home's right side: students from my college, with a Connect button on each. */
export async function CollegePeers() {
  const [peers, info] = await Promise.all([getCollegePeers(4), getShellInfo()]);

  return (
    <section className="reveal rounded-[2rem] bg-surface p-5 shadow-card sm:p-6" style={{ "--i": 1 } as React.CSSProperties}>
      <h2 className="text-lg font-bold tracking-tight">People from your college</h2>
      {info.college && <p className="truncate text-xs text-muted">{info.college}</p>}

      {peers.length === 0 ? (
        <p className="mt-4 rounded-2xl bg-surface-muted p-4 text-sm text-muted">
          No one else from your college has joined yet. Share FindMyTeam with a friend and build your team together.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {peers.map((p) => (
            <li key={p.id} className="flex items-center gap-3">
              <Link href={`/students/${p.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <StudentAvatar id={p.id} name={p.name} avatarPath={p.avatarPath} size="sm" />
                <span className="min-w-0">
                  <span className="block truncate font-semibold hover:underline">{p.name}</span>
                  <span className="block truncate text-xs text-muted">
                    {[p.branch, `Year ${p.year}`].filter(Boolean).join(" · ")}
                  </span>
                </span>
              </Link>
              <QuickConnectButton id={p.id} name={p.name} />
            </li>
          ))}
        </ul>
      )}

      <Link href="/discover?go=1" className="group mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-ink">
        See more students in Scout
        <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-1" />
      </Link>
    </section>
  );
}
