"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/home", label: "Home" },
  { href: "/discover", label: "Discover" },
  { href: "/teams", label: "Teams" },
  { href: "/requests", label: "Requests" },
  { href: "/hackathons", label: "Hackathons" },
  { href: "/profile", label: "Profile" },
];

/** The links, with the active one highlighted when `pathname` matches. */
export function NavLinks({ pathname }: { pathname: string }) {
  return (
    <nav aria-label="Main" className="flex max-w-full items-center gap-1 overflow-x-auto">
      {LINKS.map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              active ? "bg-accent-soft text-accent-ink" : "text-muted hover:bg-surface-muted hover:text-foreground"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Reads the URL, so it must sit inside <Suspense>; the fallback is <NavLinks pathname="" />. */
export function AppNav() {
  return <NavLinks pathname={usePathname()} />;
}
