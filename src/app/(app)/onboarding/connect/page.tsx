import type { Metadata } from "next";
import { Suspense } from "react";
import { CardSkeleton } from "@/components/skeleton";
import { AuthShell } from "@/components/auth-shell";
import { OnboardingStepper } from "@/components/onboarding-stepper";
import { GithubConnectCard, GithubNotice } from "@/components/github-connect-card";
import { requireOnboardedProfile } from "@/lib/auth/dal";
import { getMyGithubConnection } from "@/lib/profile/data";
import { LinkedinForm } from "./linkedin-form";

export const metadata: Metadata = { title: "Connect your accounts" };

/** Step 2 of the guided setup. Everything here is optional and can be done later from the profile. */
export default function ConnectStepPage(props: PageProps<"/onboarding/connect">) {
  return (
    <AuthShell
      wide
      showLogo={false}
      above={<OnboardingStepper current={1} />}
      title="Connect GitHub (optional)"
      subtitle="Step 2 of 3. Show your work on your profile. LinkedIn is optional too, and you can add both later."
    >
      <Suspense fallback={<CardSkeleton lines={5} />}>
        <ConnectStep searchParams={props.searchParams} />
      </Suspense>
    </AuthShell>
  );
}

async function ConnectStep({ searchParams }: { searchParams: PageProps<"/onboarding/connect">["searchParams"] }) {
  await requireOnboardedProfile();
  const sp = await searchParams;
  const connection = await getMyGithubConnection();

  return (
    <div className="space-y-6">
      <GithubNotice code={sp.github} />
      <GithubConnectCard username={connection.username} verified={connection.verified} next="/onboarding/connect" />
      <hr className="border-border" />
      <LinkedinForm defaultValue={connection.linkedinUrl ?? ""} />
    </div>
  );
}
