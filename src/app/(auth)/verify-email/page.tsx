import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth-shell";
import { EmailCodeForm } from "@/components/email-code-form";
import { CardSkeleton } from "@/components/skeleton";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/site-url";
import { sendMyCode, verifyMyCode } from "../actions";

export const metadata: Metadata = { title: "Verify your email" };

/** D27: after Google, the student confirms their email with a one-time code before going further. */
export default function VerifyEmailPage(props: PageProps<"/verify-email">) {
  return (
    <AuthShell title="Verify your email" subtitle="One quick step. We'll email you a code to confirm it's really you.">
      <Suspense fallback={<CardSkeleton lines={3} />}>
        <Verify searchParams={props.searchParams} />
      </Suspense>
    </AuthShell>
  );
}

async function Verify({ searchParams }: { searchParams: PageProps<"/verify-email">["searchParams"] }) {
  await connection();
  const sp = await searchParams;
  const next = safeNextPath(typeof sp.next === "string" ? sp.next : null, "/home");
  const supabase = await createClient();
  // getUser asks the auth server, so a mark set since the token was issued is seen here.
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  if (data.user.app_metadata?.email_code_verified === true) {
    redirect(`/auth/refresh?next=${encodeURIComponent(next)}`);
  }
  return <EmailCodeForm send={sendMyCode} verify={verifyMyCode} next={next} fixedEmail={data.user.email ?? ""} sendLabel="Email me a code" />;
}
