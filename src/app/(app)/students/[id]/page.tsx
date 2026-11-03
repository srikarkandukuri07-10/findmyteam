import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ProfileCard } from "@/components/profile-view";
import { requireOnboardedProfile } from "@/lib/auth/dal";
import { getProfileView } from "@/lib/profile/data";

export const metadata: Metadata = { title: "Student profile" };

export default function StudentPage(props: PageProps<"/students/[id]">) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-4 px-4 py-8">
      <Link href="/hackathons" className="inline-block text-sm font-medium hover:text-accent">
        ← Back
      </Link>
      <Suspense fallback={<p className="text-sm">Loading profile…</p>}>
        <Student params={props.params} />
      </Suspense>
    </main>
  );
}

async function Student({ params }: { params: PageProps<"/students/[id]">["params"] }) {
  await requireOnboardedProfile();
  const { id } = await params;
  const profile = await getProfileView(id);
  if (profile.isMe) redirect("/profile");
  return <ProfileCard profile={profile} />;
}
