import type { ReactNode } from "react";
import { PageTransition } from "@/components/page-transition";
import { Logo } from "./logo";

/** Centred card used by every sign-in, sign-up and onboarding screen. */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  wide = false,
  showLogo = true,
  above,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  /** Off inside the signed-in app, whose header already shows it. */
  showLogo?: boolean;
  /** Shown above the card, e.g. the onboarding progress. */
  above?: ReactNode;
}) {
  return (
    <PageTransition>
    <main className="flex flex-1 flex-col items-center px-4 py-10 sm:py-16">
      <div className={`w-full ${wide ? "max-w-xl" : "max-w-sm"}`}>
        {showLogo && (
          <div className="mb-8 flex justify-center">
            <Logo />
          </div>
        )}
        {above}
        <div className="reveal rounded-3xl bg-surface p-6 shadow-card sm:p-8">
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-muted">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
        {footer && <div className="mt-6 text-center text-sm">{footer}</div>}
      </div>
    </main>
    </PageTransition>
  );
}
