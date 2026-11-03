import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth-shell";
import { GithubConnectCard, GithubNotice } from "@/components/github-connect-card";
import { requireOnboardedProfile } from "@/lib/auth/dal";
import { getMyGithubConnection } from "@/lib/profile/data";
import { LinkedinForm } from "./linkedin-form";

export const metadata: Metadata = { title: "Connect your accounts" };

/** Step 2 of onboarding. Everything here is optional and can be done later from the profile. */
export default function ConnectStepPage(props: PageProps<"/onboarding/connect">) {
  return (
    <AuthShell
      wide
      showLogo={false}
      title="Add your GitHub and LinkedIn"
      subtitle="Step 2 of 2. Both are optional, and you can add them later from your profile."
    >
      <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
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
