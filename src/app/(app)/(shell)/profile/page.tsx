import type { Metadata } from "next";
import { Suspense } from "react";
import { CardSkeleton } from "@/components/skeleton";
import { PageTransition } from "@/components/page-transition";
import Link from "next/link";
import { CompletenessCard } from "@/components/completeness-card";
import { ArrowRightIcon, BadgeCheckIcon } from "@/components/icons";
import { GithubNotice } from "@/components/github-connect-card";
import { ProfileCard } from "@/components/profile-view";
import { ButtonLink, PageHeader } from "@/components/ui";
import { requireOnboardedProfile, requireUser } from "@/lib/auth/dal";
import { getMyCompleteness, getProfileView } from "@/lib/profile/data";

export const metadata: Metadata = { title: "My profile" };

export default function MyProfilePage(props: PageProps<"/profile">) {
  return (
    <PageTransition>
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-4 px-4 py-8">
      <PageHeader title="My profile" subtitle="This is what other students see." />
      <Suspense fallback={<CardSkeleton lines={5} />}>
        <MyProfile searchParams={props.searchParams} />
      </Suspense>
    </main>
    </PageTransition>
  );
}

async function MyProfile({ searchParams }: { searchParams: PageProps<"/profile">["searchParams"] }) {
  await requireOnboardedProfile();
  const sp = await searchParams;
  const { userId } = await requireUser();
  const [profile, completeness] = await Promise.all([getProfileView(userId), getMyCompleteness()]);

  return (
    <div className="space-y-4">
      <GithubNotice code={sp.github} />
      <CompletenessCard completeness={completeness} />
      {!profile.collegeVerified && (
        <Link
          href="/profile/verify"
          className="reveal flex items-center justify-between gap-4 rounded-3xl bg-surface p-5 shadow-card transition hover:shadow-lift"
        >
          <span className="flex items-center gap-3">
            <BadgeCheckIcon className="size-6 shrink-0 text-success" />
            <span>
              <span className="block font-semibold">Get the Verified student badge</span>
              <span className="block text-sm text-muted">Optional: confirm your college email with a 6-digit code.</span>
            </span>
          </span>
          <ArrowRightIcon className="size-5 shrink-0 text-muted" />
        </Link>
      )}
      <ProfileCard profile={profile} action={<ButtonLink href="/profile/edit">Edit profile</ButtonLink>} />
    </div>
  );
}
