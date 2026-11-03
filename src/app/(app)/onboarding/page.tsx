import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CardSkeleton } from "@/components/skeleton";
import { AuthShell } from "@/components/auth-shell";
import { OnboardingStepper } from "@/components/onboarding-stepper";
import { getMyProfile, requireUser } from "@/lib/auth/dal";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Set up your account" };

export default function OnboardingPage() {
  return (
    <AuthShell
      wide
      showLogo={false}
      above={<OnboardingStepper current={0} />}
      title="Finish creating your account"
      subtitle="Step 1 of 3. Tell us about your studies. Only B.Tech and B.E. students can join."
    >
      <Suspense fallback={<CardSkeleton lines={5} />}>
        <OnboardingLoader />
      </Suspense>
    </AuthShell>
  );
}

async function OnboardingLoader() {
  const profile = await getMyProfile();
  if (profile.onboarded_at) redirect("/home");

  const { supabase } = await requireUser();
  const [colleges, branches] = await Promise.all([
    supabase.from("colleges").select("id, name").order("name"),
    supabase.from("branches").select("id, name").order("sort_order"),
  ]);
  if (colleges.error) throw colleges.error;
  if (branches.error) throw branches.error;

  return (
    <OnboardingForm
      colleges={colleges.data}
      branches={branches.data}
      currentYear={new Date().getFullYear()}
    />
  );
}
