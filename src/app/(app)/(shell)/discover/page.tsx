import type { Metadata } from "next";
import { Suspense } from "react";
import { PageTransition } from "@/components/page-transition";
import { ScoutLauncher } from "@/components/scout/scout-launcher";
import { Skeleton } from "@/components/skeleton";
import { requireOnboardedProfile } from "@/lib/auth/dal";
import { getConnectsLeft, getDiscoverCandidates } from "@/lib/discover/data";
import { SCOUT_BATCH } from "@/lib/discover/swipe-logic";

export const metadata: Metadata = { title: "Scout" };

export default function ScoutPage(props: PageProps<"/discover">) {
  return (
    <PageTransition>
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 pb-12 pt-6 sm:px-6">
        <Suspense fallback={<Skeleton className="h-[420px] rounded-[2rem]" />}>
          <Scout searchParams={props.searchParams} />
        </Suspense>
      </main>
    </PageTransition>
  );
}

async function Scout({ searchParams }: { searchParams: PageProps<"/discover">["searchParams"] }) {
  await requireOnboardedProfile();
  const sp = await searchParams;
  const [candidates, connectsLeft] = await Promise.all([getDiscoverCandidates(SCOUT_BATCH), getConnectsLeft()]);

  // A new batch gets a new key, so the deck starts fresh instead of keeping the old queue.
  const batchKey = candidates.map((c) => c.id).join("-") || "empty";
  return <ScoutLauncher key={batchKey} candidates={candidates} connectsLeft={connectsLeft} autoOpen={sp.go === "1"} />;
}
