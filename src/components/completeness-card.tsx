import Link from "next/link";
import type { profileCompleteness } from "@/lib/profile/completeness";
import { Card, CardTitle } from "./ui";

/** Progress bar plus the list of things still missing from a profile. */
export function CompletenessCard({ completeness }: { completeness: ReturnType<typeof profileCompleteness> }) {
  const { percent, missing } = completeness;
  return (
    <Card className="space-y-4">
      <CardTitle>
        <span>Profile strength</span>
      </CardTitle>
      <div className="flex items-center gap-4">
        <p className="text-3xl font-semibold tracking-tight text-accent-strong">{percent}%</p>
        <div
          role="progressbar"
          aria-label="Profile strength"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="h-2.5 flex-1 overflow-hidden rounded-full bg-chip"
        >
          <div className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
        </div>
      </div>
      {missing.length === 0 ? (
        <p className="text-sm text-muted">Your profile is complete.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {missing.map((m) => (
            <li key={m.key} className="flex items-center gap-2">
              <span aria-hidden className="size-4 shrink-0 rounded border border-accent-strong" />
              <Link href="/profile/edit" className="hover:text-accent-ink">
                {m.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
