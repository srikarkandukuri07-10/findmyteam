"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, MessagesIcon, RequestsIcon, ScoutIcon, TeamsIcon } from "@/components/icons";

const ITEMS = [
  { href: "/home", label: "Home", icon: HomeIcon },
  { href: "/discover", label: "Scout", icon: ScoutIcon },
  { href: "/teams", label: "Teams", icon: TeamsIcon },
  { href: "/requests", label: "Requests", icon: RequestsIcon, badge: "requests" as const },
  { href: "/messages", label: "Messages", icon: MessagesIcon, badge: "messages" as const },
];

/** An open chat takes the whole screen, like in a phone app, so the bar steps aside there. */
const hiddenOn = (pathname: string) => /^\/messages\/[^/]+/.test(pathname);

/**
 * The phone navigation: the main sections as a bar fixed to the bottom of the screen, with the same
 * badges as the sidebar. Hidden from the `lg` breakpoint up, where the sidebar takes over.
 */
export function BottomNav(props: { pendingRequests?: number; unreadMessages?: number }) {
  return <BottomNavLinks {...props} pathname={usePathname()} />;
}

/** The bar for a given path. Reading the URL needs Suspense, so the loading state uses this with pathname "". */
export function BottomNavLinks({
  pathname,
  pendingRequests = 0,
  unreadMessages = 0,
}: {
  pathname: string;
  pendingRequests?: number;
  unreadMessages?: number;
}) {
  if (hiddenOn(pathname)) return null;
  const counts = { requests: pendingRequests, messages: unreadMessages };

  return (
    <>
      {/* Keeps the end of every page clear of the fixed bar. */}
      <div aria-hidden className="h-[calc(4.5rem+env(safe-area-inset-bottom))] shrink-0 lg:hidden" />
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-surface/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_30px_-18px_rgb(60_50_90/0.45)] backdrop-blur lg:hidden"
      >
        <ul className="mx-auto flex max-w-md items-stretch justify-around px-1">
          {ITEMS.map(({ href, label, icon: Icon, ...rest }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            const count = "badge" in rest && rest.badge ? counts[rest.badge] : 0;
            return (
              <li key={href} className="min-w-0 flex-1">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className="flex h-[4.25rem] flex-col items-center justify-center gap-1 px-1 text-[11px] font-semibold"
                >
                  <span
                    className={`relative grid h-8 w-14 place-items-center rounded-full transition-colors ${
                      active ? "bg-accent text-accent-foreground" : "text-muted"
                    }`}
                  >
                    <Icon className="size-5" />
                    {count > 0 && (
                      <span className="absolute -right-0.5 -top-1 grid min-w-4 place-items-center rounded-full bg-accent-ink px-1 text-[10px] font-bold leading-4 text-surface">
                        {count > 9 ? "9+" : count}
                      </span>
                    )}
                  </span>
                  <span className={`truncate ${active ? "text-foreground" : "text-muted"}`}>{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
