import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";

export const metadata: Metadata = { title: "Sign-in didn't work" };

export default function AuthErrorPage() {
  return (
    <AuthShell title="Sign-in didn't work" subtitle="The sign-in link may have expired or already been used.">
      <p className="text-sm">
        <Link href="/login" className="font-medium text-accent-ink">
          Sign in with Google
        </Link>{" "}
        again.
      </p>
    </AuthShell>
  );
}
