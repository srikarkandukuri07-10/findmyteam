import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth-shell";
import { devPasswordSignInAllowed } from "@/lib/auth/dev";
import { isWaitlistMode } from "@/lib/waitlist/mode";
import { DevLogInForm, GoogleSignIn } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LogInPage() {
  // AUTH-1 (D25): one Google button signs students in and creates new accounts.
  // Before launch (D24) only accounts given early access get past this page.
  const locked = isWaitlistMode();
  return (
    <AuthShell
      title={locked ? "Early access" : "Welcome to FindMyTeam"}
      subtitle={
        locked
          ? "For the FindMyTeam team only, until launch. Sign in with the Google account you were invited with."
          : "Sign in or create your account with Google."
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
        <GoogleSignIn />
        {devPasswordSignInAllowed() && <DevLogInForm />}
      </Suspense>
    </AuthShell>
  );
}
