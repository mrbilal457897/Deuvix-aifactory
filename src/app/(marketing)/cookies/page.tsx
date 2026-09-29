import {
  LegalPage,
  LegalSection,
  LegalParagraph,
  LegalList,
} from "@/components/legal-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "What cookies we use on the DEUX AI Factory website, why, and how to control them.",
  alternates: { canonical: "/cookies" },
};

export default function CookiePolicyPage() {
  return (
    <LegalPage
      badge="Legal"
      title="Cookie Policy"
      description="What cookies we use on the DEUX AI Factory website, why, and how to control them."
      lastUpdated="14 August 2026"
    >
      <LegalSection heading="1. What Are Cookies?">
        <LegalParagraph>
          Cookies are small text files stored on your device when you visit a website.
          They help the site remember your preferences and keep things running
          smoothly. Some sites also use them for analytics and advertising.
        </LegalParagraph>
      </LegalSection>

      <LegalSection heading="2. Cookies We Use">
        <LegalParagraph>
          We keep our use of cookies minimal and functional:
        </LegalParagraph>
        <LegalList
          items={[
            <>
              <strong className="text-foreground">Necessary / session cookies</strong> —
              keep you signed in to the admin area and keep the site secure. These are
              essential; without them sign-in would not work.
            </>,
          ]}
        />
        <LegalParagraph>
          We do not use advertising, analytics, or tracking cookies. Choices such as your
          theme are saved in your browser&apos;s local storage (see below), not in cookies.
        </LegalParagraph>
      </LegalSection>

      <LegalSection heading="3. Local Storage">
        <LegalParagraph>
          In addition to cookies, we may use browser local storage to remember
          preferences (such as your theme) and small UI states. Local storage is
          stored only on your device and is not sent to us automatically.
        </LegalParagraph>
      </LegalSection>

      <LegalSection heading="4. Managing Cookies">
        <LegalParagraph>
          You can control or delete cookies through your browser settings. Most
          browsers let you block all cookies or only third-party cookies, and you can
          clear stored data at any time. Please note that disabling essential cookies
          may prevent you from signing in to the admin area.
        </LegalParagraph>
      </LegalSection>

      <LegalSection heading="5. Changes to This Policy">
        <LegalParagraph>
          We may update this Cookie Policy as our site evolves. The “Last updated”
          date at the top of this page reflects the most recent revision.
        </LegalParagraph>
      </LegalSection>

      <LegalSection heading="6. Contact">
        <LegalParagraph>
          Have questions about cookies on this site? Reach us at{" "}
          <a href="mailto:deuxaiinfo786@gmail.com" className="text-primary hover:underline">
            deuxaiinfo786@gmail.com
          </a>{" "}
          or via our{" "}
          <a href="/contact" className="text-primary hover:underline">contact page</a>.
        </LegalParagraph>
      </LegalSection>
    </LegalPage>
  );
}
