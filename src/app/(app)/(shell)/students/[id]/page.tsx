import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ConnectButton } from "@/components/connect-button";
import { CardSkeleton } from "@/components/skeleton";
import { BACK_TRANSITION, PageTransition } from "@/components/page-transition";
import { ProfileCard } from "@/components/profile-view";
import { requireOnboardedProfile } from "@/lib/auth/dal";
import { getConnectionState, getProfileView } from "@/lib/profile/data";

export const metadata: Metadata = { title: "Student profile" };

export default function StudentPage(props: PageProps<"/students/[id]">) {
  return (
    <PageTransition>
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-4 px-4 pb-12 pt-6 sm:px-6">
        <Link href="/home" transitionTypes={BACK_TRANSITION} className="inline-block text-sm font-medium hover:text-accent-ink">
          ← Back
        </Link>
        <Suspense fallback={<CardSkeleton lines={6} />}>
          <Student params={props.params} />
        </Suspense>
      </main>
    </PageTransition>
  );
}

async function Student({ params }: { params: PageProps<"/students/[id]">["params"] }) {
  await requireOnboardedProfile();
  const { id } = await params;
  const profile = await getProfileView(id);
  if (profile.isMe) redirect("/profile");
  const conn = await getConnectionState(profile.id);
  return (
    <ProfileCard
      profile={profile}
      action={<ConnectButton key={`${conn.state}-${conn.requestId}`} targetId={profile.id} name={profile.displayName} initial={conn} />}
    />
  );
}
