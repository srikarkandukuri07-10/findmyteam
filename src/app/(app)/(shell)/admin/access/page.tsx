import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageTransition } from "@/components/page-transition";
import { CardSkeleton } from "@/components/skeleton";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth/dal";
import { getShellInfo } from "@/lib/shell/data";
import { AccessPanel } from "./access-panel";

export const metadata: Metadata = { title: "Team access" };

export default function AdminAccessPage() {
  return (
    <PageTransition>
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 pb-12 pt-6 sm:px-6">
        <PageHeader title="Team access" subtitle="Who can use FindMyTeam before launch. Everyone else sees the waitlist." />
        <Suspense fallback={<CardSkeleton lines={4} />}>
          <Access />
        </Suspense>
      </main>
    </PageTransition>
  );
}

async function Access() {
  const info = await getShellInfo();
  if (info.role !== "admin") notFound();
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("admin_list_early_access");
  if (error) throw error;
  return (
    <AccessPanel
      members={data.map((m) => ({ id: m.id, name: m.display_name ?? "New account", onboarded: m.onboarded, role: m.role }))}
    />
  );
}
