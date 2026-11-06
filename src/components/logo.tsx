import Image from "next/image";
import Link from "next/link";
import { APP_NAME } from "@/lib/brand";

/** The brand mark (public/brand/fmt-mark.png) with the wordmark; "My" in the accent purple, as in the logo. */
export function Logo({ href = "/", stacked = false }: { href?: string; stacked?: boolean }) {
  return (
    <Link
      href={href}
      aria-label={`${APP_NAME} home`}
      className={`inline-flex items-center font-semibold tracking-tight ${stacked ? "flex-col gap-1" : "gap-2.5"}`}
    >
      <Image
        src="/brand/fmt-mark.png"
        alt=""
        width={stacked ? 112 : 68}
        height={stacked ? 70 : 42}
        className={stacked ? "h-14 w-auto" : "h-9 w-auto rounded-lg"}
        priority
      />
      <span className={stacked ? "text-sm tracking-[0.18em]" : "text-lg"}>
        Find<span className="text-accent-ink">My</span>Team
      </span>
    </Link>
  );
}
