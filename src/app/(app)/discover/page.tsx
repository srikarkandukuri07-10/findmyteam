import type { Metadata } from "next";
import { Suspense } from "react";
import { PageTransition } from "@/components/page-transition";
import { DeckSkeleton } from "@/components/skeleton";
import { SwipeDeck } from "@/components/swipe-deck";
import { PageHeader } from "@/components/ui";
import { requireOnboardedProfile } from "@/lib/auth/dal";
import { getConnectsLeft, getDiscoverCandidates } from "@/lib/discover/data";

export const metadata: Metadata = { title: "Discover" };

export default function DiscoverPage(props: PageProps<"/discover">) {
  return (
    <PageTransition>
      <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 py-6">
        <PageHeader title="Discover" subtitle="Swipe right to send a request, left to skip." />
        <Suspense fallback={<DeckSkeleton />}>
          <Deck searchParams={props.searchParams} />
        </Suspense>
      </main>
    </PageTransition>
  );
}

async function Deck({ searchParams }: { searchParams: PageProps<"/discover">["searchParams"] }) {
  await requireOnboardedProfile();
  const sp = await searchParams;
  const [candidates, connectsLeft] = await Promise.all([getDiscoverCandidates(20), getConnectsLeft()]);

  // A new batch gets a new key, so the deck starts fresh instead of keeping the old queue.
  const batchKey = candidates.map((c) => c.id).join("-") || "empty";
  return <SwipeDeck key={batchKey} candidates={candidates} connectsLeft={connectsLeft} autoStart={sp.go === "1"} />;
}
