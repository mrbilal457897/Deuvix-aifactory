import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { clientKey, rateLimit } from "@/lib/booking/rate-limit";
import { sendTransactional } from "@/lib/mailer";
import { newsletterConfirmation, newsletterUrls } from "@/lib/email/newsletter-templates";
import {
  findSubscriber,
  insertSubscriber,
  isDisposableEmail,
  newToken,
  normaliseEmail,
  restartSubscription,
} from "@/lib/newsletter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUBSCRIBE_LIMIT = 5;
const SUBSCRIBE_WINDOW_MS = 60 * 60 * 1000;

const schema = z.object({
  email: z.string().trim().min(3).max(120).email(),
  source: z.string().max(60).optional(),
  _website: z.string().max(200).optional(),
});

const GENERIC = { ok: true, message: "If that address is eligible, a confirmation email is on its way." };

export async function POST(request: NextRequest) {
  const limited = rateLimit(clientKey(request, "newsletter"), SUBSCRIBE_LIMIT, SUBSCRIBE_WINDOW_MS);
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "too_many_requests" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
  }
  // Honeypot: bots fill the hidden field; accept silently.
  if (parsed.data._website) return NextResponse.json(GENERIC);

  const email = normaliseEmail(parsed.data.email);
  if (isDisposableEmail(email)) {
    return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
  }
  const source = parsed.data.source?.trim() || "footer";

  try {
    const existing = await findSubscriber(email);
    // Confirmed subscribers get the same generic response: no enumeration.
    if (existing?.status === "confirmed") return NextResponse.json(GENERIC);

    const confirmToken = newToken();
    const unsubscribeToken = newToken();
    if (existing) {
      await restartSubscription({ id: existing.id, confirmToken, unsubscribeToken });
    } else {
      await insertSubscriber({ email, confirmToken, unsubscribeToken, source });
    }

    const { confirmUrl, unsubscribeUrl } = newsletterUrls(confirmToken, unsubscribeToken);
    const mail = newsletterConfirmation({ confirmUrl, unsubscribeUrl });
    const result = await sendTransactional({ to: email, subject: mail.subject, html: mail.html, text: mail.text });
    if (!result.ok) {
      console.error("[newsletter] confirmation email failed:", result.error);
    }
    return NextResponse.json(GENERIC);
  } catch (err) {
    console.error("[newsletter] subscribe failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ ok: false, error: "subscribe_failed" }, { status: 500 });
  }
}
