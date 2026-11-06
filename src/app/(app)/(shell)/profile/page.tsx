import type { Metadata } from "next";
import { Suspense } from "react";
import { CardSkeleton } from "@/components/skeleton";
import { PageTransition } from "@/components/page-transition";
import { CompletenessCard } from "@/components/completeness-card";
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
      <ProfileCard profile={profile} action={<ButtonLink href="/profile/edit">Edit profile</ButtonLink>} />
    </div>
  );
}
