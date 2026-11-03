import type { Metadata } from "next";
import { Suspense } from "react";
import { requireOnboardedProfile } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Home" };

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
        <Welcome />
      </Suspense>
    </main>
  );
}

async function Welcome() {
  const profile = await requireOnboardedProfile();
  const college = profile.colleges?.name ?? profile.college_other;
  const firstName = profile.display_name?.split(" ")[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome, {firstName}</h1>
        <p className="mt-1 text-sm text-muted">
          {profile.degree === "be" ? "B.E." : "B.Tech"} · {profile.branches?.name} · {college}
        </p>
      </div>
      <div className="rounded-2xl border border-dashed border-border bg-surface p-6 text-sm text-muted">
        Your account is ready. Profiles, people discovery and teams are being built next.
      </div>
    </div>
  );
}
