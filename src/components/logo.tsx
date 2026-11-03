import Link from "next/link";
import { APP_NAME, APP_SHORT_NAME } from "@/lib/brand";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 font-semibold tracking-tight">
      <span
        aria-hidden
        className="grid h-8 place-items-center rounded-lg bg-accent px-2 text-xs font-bold tracking-wide text-accent-foreground"
      >
        {APP_SHORT_NAME}
      </span>
      <span className="text-lg">{APP_NAME}</span>
    </Link>
  );
}
