import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of use">
      <p>This service is for students currently pursuing a B.Tech or B.E. degree.</p>
      <p>Give accurate information about yourself, your studies and your achievements.</p>
      <p>Be respectful. Harassment, spam and fake accounts lead to suspension or removal.</p>
    </LegalPage>
  );
}
