import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthFrame } from "@/components/auth/auth-frame";
import { devPasswordSignInAllowed } from "@/lib/auth/dev";
import { isWaitlistMode } from "@/lib/waitlist/mode";
import { DevLogInForm, LoginOptions } from "./login-form";

export const metadata: Metadata = { title: "Log in or sign up" };

/** AUTH-1 (D25, D27): one start screen for new and returning students. Google, or an email code. */
export default function LogInPage() {
  const locked = isWaitlistMode();
  return (
    <AuthFrame
      title={locked ? "Early access" : "Welcome to FindMyTeam"}
      subtitle={locked ? "For the FindMyTeam team only, until launch." : "Log in or create your account. It takes a minute."}
      footer={
        locked ? (
          <>
            Not on the team?{" "}
            <Link href="/#join" className="font-semibold text-accent-ink">
              Join the waitlist
            </Link>
          </>
        ) : (
          <>
            By continuing you agree to our{" "}
            <Link href="/terms" className="font-semibold text-accent-ink">
              terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="font-semibold text-accent-ink">
              privacy notice
            </Link>
            .
          </>
        )
      }
    >
      {/* Reads ?next= and ?error= from the URL, which is request-time data. */}
      <Suspense>
        <LoginOptions />
        {devPasswordSignInAllowed() && <DevLogInForm />}
      </Suspense>
    </AuthFrame>
  );
}
