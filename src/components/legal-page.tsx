import type { ReactNode } from "react";
import { Logo } from "./logo";
import { CONSENT_VERSION } from "@/lib/validation/auth";

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <Logo />
      <h1 className="mt-8 text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-muted">Version {CONSENT_VERSION}</p>
      <div className="mt-6 rounded-lg bg-accent-soft px-4 py-3 text-sm">
        Draft placeholder. The final text will be reviewed by a lawyer before public launch.
      </div>
      <div className="mt-6 space-y-4 text-sm leading-6">{children}</div>
    </main>
  );
}
