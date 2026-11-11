import Image from "next/image";
import type { ReactNode } from "react";
import { Logo } from "@/components/logo";
import { FreshOnBack } from "./fresh-on-back";

const POINTS = [
  "Students from colleges across India",
  "Real skills, GitHub and a verified-student badge",
  "Free: Scout, team-up requests, teams and chat",
];

/**
 * The frame for every sign-in screen (D27): a brand panel on wide screens and one focused card.
 * No page-slide animation here: it kept the previous screen in the page, which hid the new one.
 */
export function AuthFrame({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="flex min-h-dvh flex-1">
      <FreshOnBack />
      <aside className="relative hidden w-[44%] max-w-xl flex-col justify-between overflow-hidden bg-[#2a2140] p-12 text-white lg:flex">
        <div aria-hidden className="pointer-events-none absolute -left-32 -top-32 size-[420px] rounded-full bg-accent/40 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-40 -right-24 size-[420px] rounded-full bg-[#8f74d1]/40 blur-3xl" />
        <div className="relative">
          <Image src="/brand/fmt-logo.png" alt="FindMyTeam" width={120} height={120} className="rounded-3xl shadow-lift" priority />
        </div>
        <div className="relative space-y-6">
          <h2 className="text-4xl font-bold leading-tight tracking-tight">
            Find your hackathon team,
            <span className="block text-[#c9b6ff]">beyond your friend circle.</span>
          </h2>
          <ul className="space-y-3 text-[15px] text-white/85">
            {POINTS.map((p) => (
              <li key={p} className="flex items-center gap-3">
                <span aria-hidden className="grid size-6 shrink-0 place-items-center rounded-full bg-white/15 text-xs font-bold">
                  ✓
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-white/50">Discover · Connect · Build</p>
      </aside>

      <div className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-[400px]">
          <div className="mb-8 flex justify-center lg:hidden">
            <Logo />
          </div>
          <div className="rounded-3xl bg-surface p-6 shadow-card sm:p-8">
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            {subtitle && <p className="mt-1.5 text-sm text-muted">{subtitle}</p>}
            <div className="mt-6">{children}</div>
          </div>
          {footer && <div className="mt-6 text-center text-sm text-muted">{footer}</div>}
        </div>
      </div>
    </main>
  );
}
