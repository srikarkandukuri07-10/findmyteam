import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChatThread } from "@/components/messages/chat-thread";
import { InboxList } from "@/components/messages/inbox-list";
import { PageTransition } from "@/components/page-transition";
import { Skeleton } from "@/components/skeleton";
import { requireOnboardedProfile } from "@/lib/auth/dal";
import { getThread } from "@/lib/messages/data";
import { InboxSkeleton } from "@/components/messages/inbox-skeleton";

export const metadata: Metadata = { title: "Messages" };

export default function ConversationPage(props: PageProps<"/messages/[id]">) {
  return (
    <PageTransition>
      <main className="mx-auto flex h-[calc(100dvh-5.5rem)] w-full max-w-6xl flex-1 gap-4 px-4 pb-4 pt-4 sm:px-6">
        <Suspense
          fallback={
            <>
              <section className="hidden w-[360px] shrink-0 overflow-hidden rounded-[2rem] bg-surface shadow-card lg:block">
                <InboxSkeleton />
              </section>
              <Skeleton className="h-full flex-1 rounded-[2rem]" />
            </>
          }
        >
          <Conversation params={props.params} />
        </Suspense>
      </main>
    </PageTransition>
  );
}

async function Conversation({ params }: { params: PageProps<"/messages/[id]">["params"] }) {
  await requireOnboardedProfile();
  const { id } = await params;
  const thread = await getThread(id);
  if (!thread) notFound();
  const { summary } = thread;

  return (
    <>
      {/* The inbox stays beside the chat on wide screens; on phones the chat has the whole screen. */}
      <section className="hidden w-[360px] shrink-0 flex-col overflow-hidden rounded-[2rem] bg-surface shadow-card lg:flex">
        <h1 className="px-5 pb-2 pt-5 text-2xl font-bold tracking-tight">Messages</h1>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <InboxList conversations={thread.conversations} activeId={id} />
        </div>
      </section>
      <section className="reveal min-w-0 flex-1">
        <ChatThread
          key={`${id}-${summary.blocked ? "closed" : "open"}`}
          conversationId={id}
          me={thread.me}
          other={{
            id: summary.otherId,
            name: summary.otherName,
            avatarPath: summary.otherAvatarPath,
            isDemo: summary.otherIsDemo,
          }}
          initialMessages={thread.messages}
          initialOtherReadAt={thread.otherReadAt}
          initialMuted={summary.muted}
          blocked={summary.blocked}
          team={thread.team}
        />
      </section>
    </>
  );
}
