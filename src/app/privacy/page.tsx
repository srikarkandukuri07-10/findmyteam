import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy notice">
      <h2 className="text-base font-semibold">The waitlist</h2>
      <p>
        When you join the waitlist we keep your name, email, college, branch, year of study, the roles you picked and
        your optional answer about finding a team. We use them only to invite you when FindMyTeam launches and to
        decide which colleges open first.
      </p>
      <p>
        We also keep a one-way, keyed fingerprint of your network (never the address itself) for one purpose: limiting
        how many sign-ups can come from one network in an hour, to stop spam.
      </p>
      <p>
        Nobody else can see your details. We don&apos;t sell them, we don&apos;t collect phone numbers, and you can ask
        us to delete them at any time.
      </p>
      <h2 className="pt-2 text-base font-semibold">After launch</h2>
      <p>
        We collect your email, name, college, branch, year of study, graduation year and birth year to run your account
        and to help you find hackathon teammates.
      </p>
      <p>
        You sign in with Google. Google tells us your email address, name and whether the email is verified; we
        never see your Google password.
      </p>
      <p>
        If you choose to verify your college email, we keep that address and the time you confirmed it, and send it
        a one-time code through our email provider, Resend. Other students only see a &quot;Verified student&quot;
        badge, never the address.
      </p>
      <p>Your emails are never shown to other users. We do not collect phone numbers.</p>
      <p>You will be able to export or delete your data from your account settings.</p>
    </LegalPage>
  );
}
