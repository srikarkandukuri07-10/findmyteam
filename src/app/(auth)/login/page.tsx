import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth-shell";
import { devPasswordSignInAllowed } from "@/lib/auth/dev";
import { isWaitlistMode } from "@/lib/waitlist/mode";
import { DevLogInForm, EmailSignIn, GoogleSignIn } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LogInPage() {
  // AUTH-1 (D25, D27): an email code or Google signs students in and creates new accounts. No passwords.
  // Before launch (D24) only accounts given early access get past this page.
  const locked = isWaitlistMode();
  return (
    <AuthShell
      title={locked ? "Early access" : "Log in or sign up"}
      subtitle={
        locked
          ? "For the FindMyTeam team only, until launch. Use the email you were invited with."
          : "Enter your email and we'll send you a code. No password needed."
      }
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
            By continuing you agree to the{" "}
            <Link href="/terms" className="font-medium text-accent-ink">
              terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="font-medium text-accent-ink">
              privacy notice
            </Link>
            .
          </>
        )
      }
    >
      {/* Both read ?next= and ?error= from the URL, which is request-time data. */}
      <Suspense>
        <EmailSignIn />
        <div className="my-5 flex items-center gap-3 text-xs font-medium text-muted">
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>
        <GoogleSignIn />
        {devPasswordSignInAllowed() && <DevLogInForm />}
      </Suspense>
    </AuthShell>
  );
}
