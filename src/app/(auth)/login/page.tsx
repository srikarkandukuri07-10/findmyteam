import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth-shell";
import { LogInForm } from "./login-form";

export const metadata: Metadata = { title: "Log in" };

export default function LogInPage() {
  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to find teammates and teams."
      footer={
        <>
          New here?{" "}
          <Link href="/signup" className="font-medium text-accent">
            Create an account
          </Link>
        </>
      }
    >
      {/* The form reads ?next= from the URL, which is request-time data. */}
      <Suspense>
        <LogInForm />
      </Suspense>
    </AuthShell>
  );
}
