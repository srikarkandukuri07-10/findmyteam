import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageTransition } from "@/components/page-transition";
import { RequestList } from "@/components/request-list";
import { GridSkeleton } from "@/components/skeleton";
import { ButtonLink, Card, PageHeader } from "@/components/ui";
import { requireOnboardedProfile } from "@/lib/auth/dal";
import { listRequests, type RequestDirection } from "@/lib/requests/data";

export const metadata: Metadata = { title: "Requests" };

const TABS: { id: RequestDirection; label: string }[] = [
  { id: "received", label: "Received" },
  { id: "sent", label: "Sent" },
];

export default function RequestsPage(props: PageProps<"/requests">) {
  return (
    <PageTransition>
      <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 py-8">
        <PageHeader title="Requests" subtitle="People who want to team up with you, and the ones you asked." />
        <Suspense fallback={<GridSkeleton count={3} columns="grid-cols-1" />}>
          <Requests searchParams={props.searchParams} />
        </Suspense>
      </main>
    </PageTransition>
  );
}

async function Requests({ searchParams }: { searchParams: PageProps<"/requests">["searchParams"] }) {
  await requireOnboardedProfile();
  const sp = await searchParams;
  const direction: RequestDirection = sp.tab === "sent" ? "sent" : "received";
  const items = await listRequests(direction);
  const listKey = `${direction}-${items.map((i) => `${i.id}${i.status}`).join()}`;

  return (
    <>
      <nav aria-label="Request type" className="flex gap-1 rounded-full bg-surface p-1 shadow-card">
        {TABS.map((tab) => {
          const active = tab.id === direction;
          return (
            <Link
              key={tab.id}
              href={tab.id === "received" ? "/requests" : "/requests?tab=sent"}
              aria-current={active ? "page" : undefined}
              className={`flex-1 rounded-full px-4 py-2 text-center text-sm font-semibold transition-colors duration-300 ${
                active ? "bg-accent text-accent-foreground" : "text-muted hover:text-foreground"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {items.length === 0 ? (
        <Card className="space-y-3 text-center">
          <h2 className="text-lg font-semibold">
            {direction === "received" ? "No requests yet" : "You have not sent any requests"}
          </h2>
          <p className="text-sm text-muted">
            {direction === "received"
              ? "When someone wants to team up with you, it shows up here."
              : "Swipe right on someone in Discover to ask them to team up."}
          </p>
          <div className="flex justify-center">
            <ButtonLink href="/discover">Start discovering</ButtonLink>
          </div>
        </Card>
      ) : (
        <RequestList key={listKey} items={items} direction={direction} />
      )}
    </>
  );
}
