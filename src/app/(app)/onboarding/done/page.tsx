import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CardSkeleton } from "@/components/skeleton";
import { ProfileCard } from "@/components/profile-view";
import { requireOnboardedProfile, requireUser } from "@/lib/auth/dal";
import { getProfileView } from "@/lib/profile/data";

export const metadata: Metadata = { title: "You're in" };

/** D26: the end of onboarding. The student sees their profile as others will, then enters the app. */
export default function OnboardingDonePage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-10">
      <div className="reveal text-center">
        <p className="text-4xl">🎉</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">You&apos;re all set</h1>
        <p className="mt-2 text-muted">This is how other students will see you.</p>
      </div>
      <Suspense fallback={<CardSkeleton lines={6} />}>
        <Preview />
      </Suspense>
      <div className="reveal flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/discover"
          className="rounded-full bg-accent px-7 py-3 text-center font-semibold text-accent-foreground transition hover:bg-accent-hover active:scale-[0.98]"
        >
          Start Scouting
        </Link>
        <Link href="/home" className="rounded-full bg-surface px-7 py-3 text-center font-semibold shadow-card transition hover:bg-surface-muted">
          Go to home
        </Link>
      </div>
    </main>
  );
}

async function Preview() {
  await requireOnboardedProfile();
  const { userId } = await requireUser();
  const profile = await getProfileView(userId);
  return <ProfileCard profile={profile} />;
}
