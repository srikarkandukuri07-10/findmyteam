import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CardSkeleton } from "@/components/skeleton";
import { AuthShell } from "@/components/auth-shell";
import { OnboardingStepper } from "@/components/onboarding-stepper";
import { getMyOnboarding } from "@/lib/onboarding/data";
import { getProfileForEdit } from "@/lib/profile/data";
import { OnboardingProfileForm } from "./onboarding-profile-form";

export const metadata: Metadata = { title: "What you're great at" };

/** D26 Card 2 of 3. Required: three skills and a bio. */
export default function OnboardingProfilePage() {
  return (
    <AuthShell
      wide
      showLogo={false}
      above={<OnboardingStepper current={1} />}
      title="What you're great at"
      subtitle="Step 2 of 3. This is what teammates see first, so make it count."
    >
      <Suspense fallback={<CardSkeleton lines={6} />}>
        <ProfileStep />
      </Suspense>
    </AuthShell>
  );
}

async function ProfileStep() {
  const me = await getMyOnboarding();
  if (!me.details_saved) redirect("/onboarding");
  const data = await getProfileForEdit();
  return (
    <OnboardingProfileForm
      bio={data.profile.bio ?? ""}
      skills={data.skills}
      roles={data.roles}
      selectedSkills={data.selectedSkills}
      selectedRoleIds={data.selectedRoleIds}
      selectedInterests={me.interests}
    />
  );
}
