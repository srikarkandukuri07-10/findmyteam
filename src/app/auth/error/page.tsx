import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";

export const metadata: Metadata = { title: "Link expired" };

export default function AuthErrorPage() {
  return (
    <AuthShell
      title="This link didn't work"
      subtitle="It may have expired or already been used. Links work once and expire after an hour."
    >
      <div className="space-y-3 text-sm">
        <p>
          To get a new verification link, <Link href="/login" className="font-medium text-accent-ink">log in</Link> with
          your email and password.
        </p>
        <p>
          To reset your password again, use{" "}
          <Link href="/forgot-password" className="font-medium text-accent-ink">
            Forgot password
          </Link>
          .
        </p>
      </div>
    </AuthShell>
  );
}
