import {
  LegalPage,
  LegalSection,
  LegalParagraph,
  LegalList,
} from "@/components/legal-page";
import { CompanyIdentityBlock, CompanyEmailLink } from "@/components/legal-company";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Privacy Policy",
  description:
    "How Deuvix AI Factory collects, uses, and protects your information when you use our website and services.",
  path: "/privacy",
});

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      badge="Legal"
      title="Privacy Policy"
      description="How Deuvix AI Factory collects, uses, and protects your information when you use our website and services."
      lastUpdated="14 August 2026"
    >
      <LegalSection heading="1. Who We Are">
        <LegalParagraph>
          Deuvix AI Factory (“we”, “our”, “us”) manufactures, deploys, and
          monetize Digital FTEs — AI workers that help run the next generation of
          enterprises. This Privacy Policy explains what information we collect on this
          website, why we collect it, and how you can control it.
        </LegalParagraph>
        <CompanyIdentityBlock />
      </LegalSection>

      <LegalSection heading="2. Information We Collect">
        <LegalParagraph>
          We collect only the information you choose to give us, plus minimal technical
          data needed to run the site:
        </LegalParagraph>
        <LegalList
          items={[
            <>
              <strong className="text-foreground">Discuss details</strong> — when you use
              the discussion form, we receive your name, email address, phone number,
              selected service, optional website or portfolio link, and message.
            </>,
            <>
              <strong className="text-foreground">Chat messages</strong> — when you talk
              to our assistant, we process your messages to answer your questions.
            </>,
            <>
              <strong className="text-foreground">Account details</strong> — if you sign
              in to the admin area, we receive basic profile data (such as your name and
              email) from your Google or GitHub account, or from the email address and
              password you registered with.
            </>,
            <>
              <strong className="text-foreground">Usage data</strong> — standard web
              analytics such as pages visited, approximate location, and device type.
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection heading="3. How We Use Your Information">
        <LegalList
          items={[
            "To respond to your inquiries and book consultations.",
            "To qualify and follow up on leads you submit.",
            "To improve our website, services, and content.",
            "To secure and administer the admin area.",
            "To send service-related updates (only with your consent where required).",
          ]}
        />
      </LegalSection>

      <LegalSection heading="4. How We Store and Protect It">
        <LegalParagraph>
          Submitted leads and follow-ups are stored in secured files on our servers and
          are accessible only to authorized team members. Messages submitted through the
          discussion form is delivered to our team via email. We use industry-standard
          safeguards, including encryption in transit, and never sell your personal
          information.
        </LegalParagraph>
      </LegalSection>

      <LegalSection heading="5. Sharing With Third Parties">
        <LegalParagraph>
          We do not sell or rent your data. We only share it with trusted service
          providers who help us operate the website, such as:
        </LegalParagraph>
        <LegalList
          items={[
            "Our email provider, used to deliver discussion-form messages.",
            "OAuth providers (Google, GitHub), used only when you sign in.",
            "Hosting and infrastructure providers that keep the site running.",
          ]}
        />
      </LegalSection>

      <LegalSection heading="6. Cookies">
        <LegalParagraph>
          We use a small number of cookies to keep the site working — for example,
          session cookies when you sign in. Your theme preference is stored locally in
          your browser rather than in a cookie. You can disable cookies in your browser,
          though some features may stop working. See our{" "}
          <a href="/cookies" className="text-primary hover:underline">Cookie Policy</a> for details.
        </LegalParagraph>
      </LegalSection>

      <LegalSection heading="7. Your Rights">
        <LegalList
          items={[
            "Access the personal data we hold about you.",
            "Ask us to correct inaccurate data.",
            "Ask us to delete your data.",
            "Withdraw consent and object to processing.",
          ]}
        />
        <LegalParagraph>
          To exercise any of these rights, discuss with us at <CompanyEmailLink />.
        </LegalParagraph>
      </LegalSection>

      <LegalSection heading="8. Discuss">
        <LegalParagraph>
          Questions about this policy? Reach us at <CompanyEmailLink /> or via our{" "}
          <a href="/contact" className="text-primary hover:underline">discussion page</a>.
        </LegalParagraph>
      </LegalSection>
    </LegalPage>
  );
}
