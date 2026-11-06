import type { Metadata } from "next";
import { Suspense } from "react";
import { InboxList } from "@/components/messages/inbox-list";
import { PageTransition } from "@/components/page-transition";
import { InboxSkeleton } from "@/components/messages/inbox-skeleton";
import { requireOnboardedProfile } from "@/lib/auth/dal";
import { listConversations } from "@/lib/messages/data";

export const metadata: Metadata = { title: "Messages" };

export default function MessagesPage() {
  return (
    <PageTransition>
      <main className="mx-auto flex h-[calc(100dvh-5.5rem)] w-full max-w-6xl flex-1 gap-4 px-4 pb-4 pt-4 sm:px-6">
        <section className="reveal flex w-full min-w-0 flex-col overflow-hidden rounded-[2rem] bg-surface shadow-card lg:w-[360px] lg:shrink-0">
          <h1 className="px-5 pb-2 pt-5 text-2xl font-bold tracking-tight">Messages</h1>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <Suspense fallback={<InboxSkeleton />}>
              <Inbox />
            </Suspense>
          </div>
        </section>
        <section className="reveal hidden flex-1 items-center justify-center rounded-[2rem] bg-surface/60 shadow-card lg:flex" style={{ "--i": 1 } as React.CSSProperties}>
          <div className="max-w-xs text-center">
            <span className="float mx-auto grid size-20 place-items-center rounded-[1.75rem] bg-accent-soft text-4xl">💬</span>
            <p className="mt-4 text-lg font-semibold">Pick a conversation</p>
            <p className="mt-1 text-sm text-muted">Chat with the students you&apos;ve connected with. Messages arrive instantly.</p>
          </div>
        </section>
      </main>
    </PageTransition>
  );
}

async function Inbox() {
  await requireOnboardedProfile();
  const conversations = await listConversations();
  return <InboxList conversations={conversations} />;
}
