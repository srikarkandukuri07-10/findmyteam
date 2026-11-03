import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Card, PageHeader } from "@/components/ui";
import { requireOnboardedProfile } from "@/lib/auth/dal";
import { getProfileForEdit } from "@/lib/profile/data";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Edit profile" };

export default function EditProfilePage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-4 px-4 py-8">
      <Link href="/profile" className="inline-block text-sm font-medium hover:text-accent">
        ← My profile
      </Link>
      <PageHeader title="Edit your profile" subtitle="A fuller profile gets better teammate matches." />
      <Card className="sm:p-8">
        <Suspense fallback={<p className="text-sm">Loading…</p>}>
          <EditLoader />
        </Suspense>
      </Card>
    </main>
  );
}

async function EditLoader() {
  await requireOnboardedProfile();
  const data = await getProfileForEdit();
  return <ProfileForm {...data} currentYear={new Date().getFullYear()} />;
}
