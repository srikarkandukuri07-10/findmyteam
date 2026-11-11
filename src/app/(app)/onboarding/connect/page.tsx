import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CardSkeleton } from "@/components/skeleton";
import { AuthShell } from "@/components/auth-shell";
import { OnboardingStepper } from "@/components/onboarding-stepper";
import { GithubConnectCard, GithubNotice } from "@/components/github-connect-card";
import { PastHackathonsEditor } from "@/components/past-hackathons-editor";
import { requireOnboardedProfile, requireUser } from "@/lib/auth/dal";
import { getMyGithubConnection } from "@/lib/profile/data";
import { LinkedinForm } from "./linkedin-form";

export const metadata: Metadata = { title: "Proof of work" };

/** D26 Card 3 of 3: optional proof of work. Each item raises the student in Scout. */
export default function ConnectStepPage(props: PageProps<"/onboarding/connect">) {
  return (
    <AuthShell
      wide
      showLogo={false}
      above={<OnboardingStepper current={2} />}
      title="Proof of work"
      subtitle="Step 3 of 3. All optional, but students with GitHub, LinkedIn and past hackathons show up first in Scout."
    >
      <Suspense fallback={<CardSkeleton lines={6} />}>
        <ConnectStep searchParams={props.searchParams} />
      </Suspense>
    </AuthShell>
  );
}

async function ConnectStep({ searchParams }: { searchParams: PageProps<"/onboarding/connect">["searchParams"] }) {
  await requireOnboardedProfile();
  const sp = await searchParams;
  const { supabase, userId } = await requireUser();
  const [connection, past] = await Promise.all([
    getMyGithubConnection(),
    supabase.rpc("list_past_hackathons", { p_user: userId }),
  ]);
  if (past.error) throw past.error;

  return (
    <div className="space-y-7">
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">
          GitHub <span className="font-normal text-muted">· your contributions map, repos and a verified badge</span>
        </h2>
        <GithubNotice code={sp.github} />
        <GithubConnectCard username={connection.username} verified={connection.verified} next="/onboarding/connect" />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">LinkedIn</h2>
        <LinkedinForm defaultValue={connection.linkedinUrl ?? ""} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">
          Past hackathons <span className="font-normal text-muted">· won one? Show the idea, the live link or your MVP</span>
        </h2>
        <PastHackathonsEditor items={past.data} currentYear={new Date().getFullYear()} />
      </section>

      <div className="space-y-3 border-t border-border pt-6">
        <Link
          href="/onboarding/done"
          className="flex w-full items-center justify-center rounded-full bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground transition hover:bg-accent-hover active:scale-[0.98]"
        >
          Finish
        </Link>
        <p className="text-center text-xs text-muted">You can add any of this later from your profile.</p>
      </div>
    </div>
  );
}
