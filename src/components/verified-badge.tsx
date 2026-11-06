import { BadgeCheckIcon } from "@/components/icons";

/** D25: shown for students who confirmed a college email on an approved college domain. */
export function VerifiedStudentBadge({ tone = "light", className = "" }: { tone?: "light" | "glass"; className?: string }) {
  const look =
    tone === "glass"
      ? "bg-[#1f1b2e]/70 text-surface backdrop-blur"
      : "bg-success-soft text-success";
  return (
    <span
      title="Confirmed a college email address"
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${look} ${className}`}
    >
      <BadgeCheckIcon className="size-3.5" strokeWidth={2.2} />
      Verified student
    </span>
  );
}
