import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageTransition } from "@/components/page-transition";
import { CardSkeleton } from "@/components/skeleton";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth/dal";
import { getShellInfo } from "@/lib/shell/data";
import { AccessPanel } from "./access-panel";
import { CollegesPanel } from "./colleges-panel";
import { DomainsPanel } from "./domains-panel";

export const metadata: Metadata = { title: "Team access" };

export default function AdminAccessPage() {
  return (
    <PageTransition>
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 pb-12 pt-6 sm:px-6">
        <PageHeader title="Team access" subtitle="Who can use FindMyTeam before launch, and which college email domains earn the Verified student badge." />
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
  const [members, domains, colleges] = await Promise.all([
    supabase.rpc("admin_list_early_access"),
    supabase.rpc("admin_list_college_domains"),
    supabase.rpc("admin_list_pending_colleges"),
  ]);
  if (members.error) throw members.error;
  if (domains.error) throw domains.error;
  if (colleges.error) throw colleges.error;
  return (
    <div className="space-y-6">
      <AccessPanel
        members={members.data.map((m) => ({
          id: m.id,
          name: m.display_name ?? "New account",
          onboarded: m.onboarded,
          role: m.role,
        }))}
      />
      <DomainsPanel
        domains={domains.data.map((d) => ({ domain: d.domain, approved: d.approved, students: d.students }))}
      />
      <CollegesPanel
        pending={colleges.data.map((c) => ({
          id: c.id,
          name: c.name,
          place: [c.district, c.state].filter(Boolean).join(", "),
          students: c.students,
        }))}
      />
    </div>
  );
}
