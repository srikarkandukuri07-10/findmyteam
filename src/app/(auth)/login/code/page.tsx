import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { AuthFrame } from "@/components/auth/auth-frame";
import { CodeStep } from "@/components/auth/code-step";
import { CardSkeleton } from "@/components/skeleton";
import { readPendingEmail } from "@/lib/auth/pending-email";
import { safeNextPath } from "@/lib/site-url";
import { resendLoginCode, verifyLoginCode } from "../../actions";

export const metadata: Metadata = { title: "Check your email" };

/** D27: the code step of email sign-in. The email comes from a short-lived cookie set on /login. */
export default function LoginCodePage(props: PageProps<"/login/code">) {
  return (
    <AuthFrame title="Check your email" subtitle="Enter the 6-digit code we just sent you.">
      <Suspense fallback={<CardSkeleton lines={3} />}>
        <Code searchParams={props.searchParams} />
      </Suspense>
    </AuthFrame>
  );
}

async function Code({ searchParams }: { searchParams: PageProps<"/login/code">["searchParams"] }) {
  await connection();
  const email = await readPendingEmail();
  if (!email) redirect("/login");
  const sp = await searchParams;
  const next = safeNextPath(typeof sp.next === "string" ? sp.next : null, "");
  return (
    <CodeStep
      email={email}
      next={next}
      verify={verifyLoginCode}
      resend={resendLoginCode}
      changeEmailHref={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
    />
  );
}
