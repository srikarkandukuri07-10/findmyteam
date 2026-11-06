"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { logOut } from "@/app/(auth)/actions";
import {
  BellIcon,
  ChevronDownIcon,
  CloseIcon,
  LogOutIcon,
  MenuIcon,
  PlansIcon,
  SettingsIcon,
  UserIcon,
} from "@/components/icons";
import { Logo } from "@/components/logo";
import { StudentAvatar } from "@/components/student-avatar";
import type { ShellInfo } from "@/lib/shell/data";
import { ProCard } from "./pro-card";
import { SidebarNav } from "./sidebar-nav";

function useOutsideClose(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);
  return ref;
}

function Avatar({ info }: { info: ShellInfo | null }) {
  if (!info) return <span className="shimmer size-11 shrink-0 rounded-full" />;
  return <StudentAvatar id={info.id} name={info.name} avatarPath={info.avatarPath} size="md" className="size-11" />;
}

function ProfileMenu({ info }: { info: ShellInfo | null }) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose(open, () => setOpen(false));
  const pathname = usePathname();
  // Close after navigating.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  const item = (href: string, label: string, icon: ReactNode) => (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition hover:bg-surface-muted"
    >
      {icon}
      {label}
    </Link>
  );

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-full p-1 pr-2 transition hover:bg-surface/70"
      >
        <Avatar info={info} />
        <span className="hidden text-left sm:block">
          <span className="block max-w-32 truncate text-sm font-semibold">{info?.name ?? " "}</span>
          <span className="block text-xs text-muted">{info?.role === "admin" ? "Admin" : "Student"}</span>
        </span>
        <ChevronDownIcon
          className={`size-4 text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97, transition: { duration: 0.15 } }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            className="absolute right-0 top-full z-50 mt-2 w-56 origin-top-right rounded-2xl bg-surface p-2 shadow-lift"
          >
            {item("/profile", "Your profile", <UserIcon className="size-4" />)}
            {item("/profile/edit", "Edit profile", <SettingsIcon className="size-4" />)}
            {item("/plans", "Plans", <PlansIcon className="size-4" />)}
            <hr className="my-1.5 border-border" />
            <form action={logOut}>
              <button
                type="submit"
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-danger transition hover:bg-danger-soft"
              >
                <LogOutIcon className="size-4" />
                Log out
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose(open, () => setOpen(false));
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => setOpen((o) => !o)}
        className="grid size-11 place-items-center rounded-full bg-surface/70 text-muted shadow-card transition hover:text-foreground"
      >
        <motion.span whileHover={{ rotate: [0, -14, 12, -8, 0] }} transition={{ duration: 0.5 }}>
          <BellIcon className="size-5" />
        </motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, transition: { duration: 0.15 } }}
            className="absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl bg-surface p-4 text-sm shadow-lift"
          >
            <p className="font-semibold">Notifications are coming soon</p>
            <p className="mt-1 text-muted">For now, new team-up requests show up in Requests.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const noSubscribe = () => () => {};

function MobileDrawer({ info }: { info: ShellInfo | null }) {
  const [open, setOpen] = useState(false);
  const portalReady = useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false,
  );
  return (
    <>
      <button
        type="button"
        aria-label="Open menu"
        onClick={() => setOpen(true)}
        className="grid size-11 shrink-0 place-items-center rounded-full bg-surface/70 shadow-card lg:hidden"
      >
        <MenuIcon className="size-5" />
      </button>
      {/* Rendered into <body>: the top bar's backdrop blur would otherwise trap a fixed panel inside it. */}
      {portalReady &&
        createPortal(
          <AnimatePresence>
            {open && (
              <>
                <motion.div
                  className="fixed inset-0 z-50 bg-foreground/25 backdrop-blur-[2px] lg:hidden"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setOpen(false)}
                />
                <motion.aside
                  className="fixed inset-y-0 left-0 z-50 flex w-[290px] flex-col gap-6 overflow-y-auto bg-surface p-5 shadow-lift lg:hidden"
                  initial={{ x: -320 }}
                  animate={{ x: 0 }}
                  exit={{ x: -320, transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } }}
                  transition={{ type: "spring", stiffness: 340, damping: 34 }}
                >
                  <div className="flex items-center justify-between">
                    <Logo href="/home" />
                    <button
                      type="button"
                      aria-label="Close menu"
                      onClick={() => setOpen(false)}
                      className="grid size-10 place-items-center rounded-full hover:bg-surface-muted"
                    >
                      <CloseIcon className="size-5" />
                    </button>
                  </div>
                  <SidebarNav
                    layoutGroup="drawer"
                    pendingRequests={info?.pendingRequests}
                    onNavigate={() => setOpen(false)}
                  />
                  <div className="mt-auto">
                    <ProCard />
                  </div>
                </motion.aside>
              </>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}

/** The top bar while the student's name loads: same size, no menus. */
export function TopbarPlaceholder({ search }: { search: ReactNode }) {
  return (
    <header className="sticky top-0 z-40 px-4 pt-4 sm:px-6">
      <div className="flex items-center gap-3 rounded-full py-1">
        <span className="size-11 shrink-0 rounded-full bg-surface/70 shadow-card lg:hidden" />
        <div className="min-w-0 flex-1">{search}</div>
        <span className="size-11 rounded-full bg-surface/70 shadow-card" />
        <span className="shimmer size-11 rounded-full" />
      </div>
    </header>
  );
}

/** The bar above every app page: menu (phones), universal search, notifications and the profile menu. */
export function Topbar({ info, search }: { info: ShellInfo | null; search: ReactNode }) {
  return (
    <header className="sticky top-0 z-40 px-4 pt-4 sm:px-6">
      <div className="flex items-center gap-3 rounded-full bg-background/70 py-1 backdrop-blur-md">
        <MobileDrawer info={info} />
        <div className="min-w-0 flex-1">{search}</div>
        <NotificationsBell />
        <ProfileMenu info={info} />
      </div>
    </header>
  );
}
