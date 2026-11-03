import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BACK_TRANSITION, PageTransition } from "@/components/page-transition";
import { GithubConnectCard, GithubNotice } from "@/components/github-connect-card";
import { Card, PageHeader } from "@/components/ui";
import { requireOnboardedProfile } from "@/lib/auth/dal";
import { getProfileForEdit } from "@/lib/profile/data";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Edit profile" };

export default function EditProfilePage(props: PageProps<"/profile/edit">) {
  return (
    <PageTransition>
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-4 px-4 py-8">
      <Link href="/profile" transitionTypes={BACK_TRANSITION} className="inline-block text-sm font-medium hover:text-accent-ink">
        ← My profile
      </Link>
      <PageHeader title="Edit your profile" subtitle="Tell other students what you bring to a team." />
      <Suspense fallback={<p className="text-sm">Loading…</p>}>
        <EditLoader searchParams={props.searchParams} />
      </Suspense>
    </main>
    </PageTransition>
  );
}

async function EditLoader({ searchParams }: { searchParams: PageProps<"/profile/edit">["searchParams"] }) {
  await requireOnboardedProfile();
  const sp = await searchParams;
  const data = await getProfileForEdit();

  return (
    <div className="space-y-4">
      <GithubNotice code={sp.github} />
      {/* Its own forms, so it sits above (not inside) the profile form. */}
      <Card>
        <GithubConnectCard
          username={data.profile.github_username}
          verified={data.profile.github_id != null}
          next="/profile/edit"
        />
      </Card>
      <Card className="sm:p-8">
        <ProfileForm {...data} currentYear={new Date().getFullYear()} />
      </Card>
    </div>
  );
}
