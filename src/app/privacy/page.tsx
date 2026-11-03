import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy notice">
      <p>
        We collect your email, name, college, branch, year of study, graduation year and birth year to run your account
        and to help you find hackathon teammates.
      </p>
      <p>Your email is never shown to other users. We do not collect phone numbers.</p>
      <p>You will be able to export or delete your data from your account settings.</p>
    </LegalPage>
  );
}
