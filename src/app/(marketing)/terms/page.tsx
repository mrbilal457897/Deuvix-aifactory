import {
  LegalPage,
  LegalSection,
  LegalParagraph,
  LegalList,
} from "@/components/legal-page";

export default function TermsOfServicePage() {
  return (
    <LegalPage
      badge="Legal"
      title="Terms of Service"
      description="The terms that govern your use of the Deux website and our services."
      lastUpdated="14 August 2026"
    >
      <LegalSection heading="1. Acceptance of Terms">
        <LegalParagraph>
          By accessing or using the Deux website, you agree to be bound by these Terms
          of Service. If you do not agree, please do not use the site. We may update
          these terms from time to time; continued use after changes means you accept
          the revised terms.
        </LegalParagraph>
      </LegalSection>

      <LegalSection heading="2. About Our Services">
        <LegalParagraph>
          Deux is an AI Agent Factory. We manufacture, deploy, and monetize Digital
          FTEs — AI workers that operate as the workforce for modern enterprises. Our
          services include:
        </LegalParagraph>
        <LegalList
          items={[
            "Digital FTE deployment",
            "FDE (Forward Deployed Engineering) consulting",
            "AI agent e-books and guides",
            "AI-powered web applications",
            "Business AI solutions",
          ]}
        />
      </LegalSection>

      <LegalSection heading="3. Acceptable Use">
        <LegalParagraph>
          You agree not to misuse the website, including:
        </LegalParagraph>
        <LegalList
          items={[
            "Attempting to gain unauthorized access to the admin area or any server.",
            "Interfering with the site&apos;s operation, including denial-of-service attacks.",
            "Submitting false, abusive, or unlawful content through forms or chat.",
            "Scraping or copying content for commercial reuse without permission.",
            "Using the site in any way that violates applicable law.",
          ]}
        />
      </LegalSection>

      <LegalSection heading="4. Intellectual Property">
        <LegalParagraph>
          All content on this website — including text, graphics, logos, and code — is
          the property of Deux unless stated otherwise. You may view and share our
          public content for informational purposes, but you may not reproduce or
          redistribute it commercially without our written consent.
        </LegalParagraph>
      </LegalSection>

      <LegalSection heading="5. Disclaimers">
        <LegalParagraph>
          The website and its content are provided “as is” and “as available”, without
          warranties of any kind, express or implied. We make every effort to keep the
          site accurate and available, but we do not guarantee that it will be
          error-free, uninterrupted, or that our AI agents will perform to any specific
          outcome. Any reliance on our content is at your own risk.
        </LegalParagraph>
      </LegalSection>

      <LegalSection heading="6. Limitation of Liability">
        <LegalParagraph>
          To the maximum extent permitted by law, Deux will not be liable for any
          indirect, incidental, or consequential damages arising from your use of the
          website or any service engagement, even if we were advised of the possibility
          of such damages.
        </LegalParagraph>
      </LegalSection>

      <LegalSection heading="7. Third-Party Links">
        <LegalParagraph>
          Our website may link to third-party sites or resources (such as GitHub or
          LinkedIn). We are not responsible for their content or privacy practices.
          Visiting them is subject to their own terms and policies.
        </LegalParagraph>
      </LegalSection>

      <LegalSection heading="8. Governing Law">
        <LegalParagraph>
          These terms are governed by the laws of Pakistan. Any disputes shall be
          subject to the exclusive jurisdiction of the courts of Pakistan.
        </LegalParagraph>
      </LegalSection>

      <LegalSection heading="9. Contact">
        <LegalParagraph>
          Questions about these terms? Reach us at{" "}
          <a href="mailto:sobber.id@gmail.com" className="text-primary hover:underline">
            sobber.id@gmail.com
          </a>{" "}
          or via our{" "}
          <a href="/contact" className="text-primary hover:underline">contact page</a>.
        </LegalParagraph>
      </LegalSection>
    </LegalPage>
  );
}
