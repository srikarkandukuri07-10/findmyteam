import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { AuthFrame } from "@/components/auth/auth-frame";
import { CodeStep } from "@/components/auth/code-step";
import { CardSkeleton } from "@/components/skeleton";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/site-url";
import { logOut, sendMyCode, verifyMyCode } from "../actions";

export const metadata: Metadata = { title: "Confirm your email" };

/**
 * D27: the first time someone signs in with Google, they confirm that Gmail with a code before going
 * further. The code is sent as soon as this screen opens. Never shown again once confirmed.
 */
export default function VerifyEmailPage(props: PageProps<"/verify-email">) {
  return (
    <AuthFrame
      title="Confirm your email"
      subtitle="One-time check for new accounts. Enter the 6-digit code we're sending you."
      footer={
        <form action={logOut}>
          Wrong account?{" "}
          <button type="submit" className="font-semibold text-accent-ink">
            Sign out
          </button>
        </form>
      }
    >
      <Suspense fallback={<CardSkeleton lines={3} />}>
        <Verify searchParams={props.searchParams} />
      </Suspense>
    </AuthFrame>
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
  return <CodeStep email={data.user.email ?? ""} next={next} verify={verifyMyCode} resend={sendMyCode} autoSend />;
}
