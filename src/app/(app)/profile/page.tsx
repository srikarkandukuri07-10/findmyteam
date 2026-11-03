import type { Metadata } from "next";
import { Suspense } from "react";
import { CompletenessCard } from "@/components/completeness-card";
import { ProfileCard } from "@/components/profile-view";
import { ButtonLink, PageHeader } from "@/components/ui";
import { requireOnboardedProfile, requireUser } from "@/lib/auth/dal";
import { getMyCompleteness, getProfileView } from "@/lib/profile/data";

export const metadata: Metadata = { title: "My profile" };

export default function MyProfilePage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-4 px-4 py-8">
      <PageHeader
        title="My profile"
        subtitle="This is what other students see."
        action={<ButtonLink href="/profile/edit">Edit profile</ButtonLink>}
      />
      <Suspense fallback={<p className="text-sm">Loading your profile…</p>}>
        <MyProfile />
      </Suspense>
    </main>
  );
}

async function MyProfile() {
  await requireOnboardedProfile();
  const { userId } = await requireUser();
  const [profile, completeness] = await Promise.all([getProfileView(userId), getMyCompleteness()]);

  return (
    <div className="space-y-4">
      <CompletenessCard completeness={completeness} />
      <ProfileCard profile={profile} />
    </div>
  );
}
