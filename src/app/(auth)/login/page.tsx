import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth-shell";
import { isWaitlistMode } from "@/lib/waitlist/mode";
import { LogInForm } from "./login-form";

export const metadata: Metadata = { title: "Log in" };

export default function LogInPage() {
  // Before launch (D24) this page is only for early-access accounts; sign-up and emailed resets are closed.
  const locked = isWaitlistMode();
  return (
    <AuthShell
      title={locked ? "Early access" : "Welcome back"}
      subtitle={locked ? "For the FindMyTeam team only, until launch." : "Log in to find teammates and teams."}
      footer={
        locked ? (
          <>
            Not on the team?{" "}
            <Link href="/#join" className="font-medium text-accent-ink">
              Join the waitlist
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link href="/signup" className="font-medium text-accent-ink">
              Create an account
            </Link>
          </>
        )
      }
    >
      {/* The form reads ?next= from the URL, which is request-time data. */}
      <Suspense>
        <LogInForm showForgot={!locked} />
      </Suspense>
    </AuthShell>
  );
}
