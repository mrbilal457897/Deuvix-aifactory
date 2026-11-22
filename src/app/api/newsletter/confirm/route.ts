import { NextResponse, type NextRequest } from "next/server";
import { sendTransactional } from "@/lib/mailer";
import { newsletterWelcome, newsletterUrls } from "@/lib/email/newsletter-templates";
import { confirmSubscriber, findByConfirmToken, isTokenExpired } from "@/lib/newsletter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")?.trim() ?? "";
  if (!token) return NextResponse.redirect(new URL("/newsletter/invalid", request.url));

  try {
    const subscriber = await findByConfirmToken(token);
    if (!subscriber || !subscriber.confirmToken || subscriber.confirmToken !== token ||
        isTokenExpired(subscriber.createdAt)) {
      return NextResponse.redirect(new URL("/newsletter/invalid", request.url));
    }

    const ok = await confirmSubscriber(subscriber.id);
    if (!ok) return NextResponse.redirect(new URL("/newsletter/invalid", request.url));

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

    return NextResponse.redirect(new URL("/newsletter/confirmed", request.url));
  } catch (err) {
    console.error("[newsletter] confirm failed:", err instanceof Error ? err.message : err);
    return NextResponse.redirect(new URL("/newsletter/invalid", request.url));
  }
}
