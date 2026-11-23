import Link from "next/link";
import { StudentAvatar } from "@/components/student-avatar";
import type { ShellInfo } from "@/lib/shell/data";

/** The student's own card at the top of the sidebar: banner, photo, name, college and a link to their profile. */
export function ProfileCard({ info, onNavigate }: { info: ShellInfo | null; onNavigate?: () => void }) {
  if (!info) {
    return (
      <div className="shrink-0 overflow-hidden rounded-3xl bg-surface-muted/70">
        <div className="shimmer h-14" />
        <div className="space-y-2 px-4 pb-4">
          <span className="shimmer -mt-7 block size-14 rounded-full ring-4 ring-surface" />
          <span className="shimmer block h-4 w-28 rounded-full" />
          <span className="shimmer block h-3 w-36 rounded-full" />
        </div>
      </div>
    );
  }
  return (
    <Link
      href="/profile"
      onClick={onNavigate}
      className="group block shrink-0 overflow-hidden rounded-3xl bg-surface-muted/70 transition hover:bg-surface-muted"
    >
      <div aria-hidden className="h-14 bg-gradient-to-br from-accent-soft via-[#b9a6e3] to-accent" />
      <div className="px-4 pb-4">
        <StudentAvatar
          id={info.id}
          name={info.name}
          avatarPath={info.avatarPath}
          size="lg"
          className="-mt-7 size-14 ring-4"
        />
        <p className="mt-2 truncate font-semibold tracking-tight">{info.name}</p>
        {info.college && <p className="truncate text-xs text-muted">{info.college}</p>}
        <p className="mt-1.5 text-xs font-semibold text-accent-ink group-hover:underline">View your profile</p>
      </div>
    </Link>
  );
}
