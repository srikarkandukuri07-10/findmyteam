import type { Metadata } from "next";
import { Suspense } from "react";
import { CardSkeleton } from "@/components/skeleton";
import { AuthShell } from "@/components/auth-shell";
import { OnboardingStepper } from "@/components/onboarding-stepper";
import { requireOnboardedProfile } from "@/lib/auth/dal";
import { getProfileForEdit } from "@/lib/profile/data";
import { OnboardingProfileForm } from "./onboarding-profile-form";

export const metadata: Metadata = { title: "Build your profile" };

/** Step 3 of the guided setup. Optional, and everything can be changed later. */
export default function OnboardingProfilePage() {
  return (
    <AuthShell
      wide
      showLogo={false}
      above={<OnboardingStepper current={2} />}
      title="Build your profile"
      subtitle="Step 3 of 3. Tell other students what you bring. You can change all of this later."
    >
      <Suspense fallback={<CardSkeleton lines={5} />}>
        <ProfileStep />
      </Suspense>
    </AuthShell>
  );
}

async function ProfileStep() {
  await requireOnboardedProfile();
  const data = await getProfileForEdit();
  return (
    <OnboardingProfileForm
      bio={data.profile.bio ?? ""}
      skills={data.skills}
      roles={data.roles}
      selectedSkills={data.selectedSkills}
      selectedRoleIds={data.selectedRoleIds}
    />
  );
}
