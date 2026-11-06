"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import type { ComponentType, SVGProps } from "react";
import {
  BellIcon,
  EventsIcon,
  HelpIcon,
  HomeIcon,
  MessagesIcon,
  PlansIcon,
  RequestsIcon,
  ScoutIcon,
  SettingsIcon,
  TeamsIcon,
} from "@/components/icons";

type Item = {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Shown but not clickable yet. */
  soon?: boolean;
  badge?: "requests";
};

const MAIN: Item[] = [
  { href: "/home", label: "Home", icon: HomeIcon },
  { href: "/discover", label: "Scout", icon: ScoutIcon },
  { href: "/teams", label: "Teams", icon: TeamsIcon },
  { href: "/requests", label: "Requests", icon: RequestsIcon, badge: "requests" },
  { href: "/hackathons", label: "Events", icon: EventsIcon },
  { href: "/messages", label: "Messages", icon: MessagesIcon, soon: true },
  { href: "/notifications", label: "Notifications", icon: BellIcon, soon: true },
];

const SECONDARY: Item[] = [
  { href: "/plans", label: "Plans", icon: PlansIcon },
  { href: "/profile/edit", label: "Settings", icon: SettingsIcon },
  { href: "/help", label: "Help & Support", icon: HelpIcon },
];

function isActive(pathname: string, href: string) {
  if (href === "/profile/edit") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The sidebar's links. The active one sits on a purple pill that glides between items.
 * `layoutGroup` keeps the desktop sidebar and the mobile drawer from sharing one pill.
 */
export function SidebarNav(props: { pendingRequests?: number; layoutGroup: string; onNavigate?: () => void }) {
  return <SidebarLinks {...props} pathname={usePathname()} />;
}

/** The links for a given path. Reading the URL needs Suspense, so loading states use this with pathname "". */
export function SidebarLinks({
  pathname,
  pendingRequests = 0,
  layoutGroup,
  onNavigate,
}: {
  pathname: string;
  pendingRequests?: number;
  layoutGroup: string;
  onNavigate?: () => void;
}) {
  const render = (item: Item) => {
    const active = !item.soon && isActive(pathname, item.href);
    const Icon = item.icon;
    const badge = item.badge === "requests" && pendingRequests > 0 ? pendingRequests : null;
    const inner = (
      <>
        {active && (
          <motion.span
            layoutId={`nav-pill-${layoutGroup}`}
            className="absolute inset-0 rounded-2xl bg-accent-soft shadow-card"
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
          />
        )}
        <Icon className={`relative size-5 shrink-0 transition-transform duration-200 group-hover:scale-110 ${active ? "text-accent-ink" : ""}`} />
        <span className="relative flex-1">{item.label}</span>
        {badge !== null && (
          <motion.span
            key={badge}
            initial={{ scale: 0.4 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 18 }}
            className="relative grid min-w-6 place-items-center rounded-full bg-accent px-1.5 py-0.5 text-xs font-bold text-accent-foreground"
          >
            {badge > 99 ? "99+" : badge}
          </motion.span>
        )}
        {item.soon && (
          <span className="relative rounded-full bg-chip px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
            Soon
          </span>
        )}
      </>
    );
    const cls = `group relative flex items-center gap-3 rounded-2xl px-4 py-2 text-[15px] font-medium transition-colors ${
      active ? "text-accent-ink" : item.soon ? "cursor-default text-muted/70" : "text-muted hover:bg-surface-muted/70 hover:text-foreground"
    }`;
    return (
      <li key={item.href}>
        {item.soon ? (
          <span className={cls} aria-disabled title="Coming soon">
            {inner}
          </span>
        ) : (
          <Link href={item.href} aria-current={active ? "page" : undefined} onClick={onNavigate} className={cls}>
            {inner}
          </Link>
        )}
      </li>
    );
  };

  return (
    <nav aria-label="Main" className="flex flex-col gap-4">
      <ul className="space-y-1">{MAIN.map(render)}</ul>
      <hr className="mx-4 border-border" />
      <ul className="space-y-1">{SECONDARY.map(render)}</ul>
    </nav>
  );
}
