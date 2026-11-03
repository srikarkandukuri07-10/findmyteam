import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { SignUpForm } from "./signup-form";

export const metadata: Metadata = { title: "Sign up" };

export default function SignUpPage() {
  return (
    <AuthShell
      title="Create your account"
      subtitle="For students currently pursuing a B.Tech or B.E."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-accent-ink">
            Log in
          </Link>
        </>
      }
    >
      <SignUpForm />
    </AuthShell>
  );
}
