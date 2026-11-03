import type { ReactNode } from "react";
import { Logo } from "./logo";

/** Centred card used by every sign-in, sign-up and onboarding screen. */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  wide = false,
  showLogo = true,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  /** Off inside the signed-in app, whose header already shows it. */
  showLogo?: boolean;
}) {
  return (
    <main className="flex flex-1 flex-col items-center px-4 py-10 sm:py-16">
      <div className={`w-full ${wide ? "max-w-xl" : "max-w-sm"}`}>
        {showLogo && (
          <div className="mb-8 flex justify-center">
            <Logo />
          </div>
        )}
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-muted">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
        {footer && <div className="mt-6 text-center text-sm text-muted">{footer}</div>}
      </div>
    </main>
  );
}
