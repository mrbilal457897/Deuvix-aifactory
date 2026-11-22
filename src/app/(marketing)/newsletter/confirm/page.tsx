import { redirect } from "next/navigation";
import { sendTransactional } from "@/lib/mailer";
import { newsletterWelcome, newsletterUrls } from "@/lib/email/newsletter-templates";
import { confirmSubscriber, findByConfirmToken, isTokenExpired } from "@/lib/newsletter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public confirmation link used in the email. This is a page route (not /api)
 * so it never passes through the admin-only API middleware gate.
 */
export default async function ConfirmLinkPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) redirect("/newsletter/invalid");

  const subscriber = await findByConfirmToken(token);
  if (
    !subscriber ||
    !subscriber.confirmToken ||
    subscriber.confirmToken !== token ||
    isTokenExpired(subscriber.createdAt)
  ) {
    redirect("/newsletter/invalid");
  }

  const ok = await confirmSubscriber(subscriber.id);
  if (!ok) redirect("/newsletter/invalid");

  if (subscriber.unsubscribeToken) {
    const { unsubscribeUrl } = newsletterUrls(token, subscriber.unsubscribeToken);
    const mail = newsletterWelcome({ unsubscribeUrl });
    const result = await sendTransactional({
      to: subscriber.email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });
    if (!result.ok) console.error("[newsletter] welcome email failed:", result.error);
  }

  redirect("/newsletter/confirmed");
}
