import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CardSkeleton } from "@/components/skeleton";
import { AuthShell } from "@/components/auth-shell";
import { OnboardingStepper } from "@/components/onboarding-stepper";
import { requireUser } from "@/lib/auth/dal";
import { getMyOnboarding } from "@/lib/onboarding/data";
import { VerifyPanel } from "@/app/(app)/(shell)/profile/verify/verify-panel";
import { DetailsForm } from "./onboarding-form";

export const metadata: Metadata = { title: "You & your college" };

/** D26 Card 1 of 3: name, private phone, college (all India) and studies; optional college-email badge. */
export default function OnboardingPage() {
  return (
    <AuthShell
      wide
      showLogo={false}
      above={<OnboardingStepper current={0} />}
      title="You & your college"
      subtitle="Step 1 of 3. Only B.Tech and B.E. students can join."
    >
      <Suspense fallback={<CardSkeleton lines={6} />}>
        <DetailsLoader />
      </Suspense>
    </AuthShell>
  );
}

/** A code is still usable until it expires. Read at request time (requireUser marks the render dynamic). */
function stillValid(expiresAt: string | null) {
  return expiresAt !== null && Date.parse(expiresAt) > Date.now();
}

async function DetailsLoader() {
  const me = await getMyOnboarding();
  if (me.onboarded) redirect("/home");

  const { supabase } = await requireUser();
  const [branches, verification] = await Promise.all([
    supabase.from("branches").select("id, name").order("sort_order"),
    supabase.rpc("my_college_verification"),
  ]);
  if (branches.error) throw branches.error;
  if (verification.error) throw verification.error;
  const v = verification.data[0];

  return (
    <DetailsForm
      branches={branches.data}
      currentYear={new Date().getFullYear()}
      defaults={{
        displayName: me.display_name ?? me.googleName,
        email: me.email,
        phone: me.phone ?? "",
        college: me.college_id && me.college_name
          ? { id: me.college_id, name: me.college_name, place: me.college_place, kind: "college", pending: false }
          : null,
        degree: me.degree ?? "",
        branchId: me.branch_id ? String(me.branch_id) : "",
        yearOfStudy: me.year_of_study ? String(me.year_of_study) : "",
        graduationYear: me.graduation_year ? String(me.graduation_year) : "",
        birthYear: me.birth_year ? String(me.birth_year) : "",
      }}
    >
      <section className="space-y-3 rounded-3xl bg-surface-muted p-5">
        <div>
          <h2 className="text-sm font-semibold">
            College email <span className="font-normal text-muted">(optional)</span>
          </h2>
          <p className="mt-1 text-sm text-muted">
            Confirm your college email with a 6-digit code to get the <b>Verified student</b> badge. Verified students rank
            higher in Scout.
          </p>
        </div>
        <VerifyPanel
          confirmed={v?.email ?? null}
          badge={Boolean(v?.badge)}
          waitingForDomain={Boolean(v?.email && !v.domain_approved)}
          pendingEmail={
            v?.pending_email && (v.attempts_left ?? 0) > 0 && stillValid(v.code_expires_at) ? v.pending_email : null
          }
          compact
        />
      </section>
    </DetailsForm>
  );
}
