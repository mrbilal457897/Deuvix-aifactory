import type { Metadata } from "next";
import { BookingPage } from "@/components/booking/booking-page";
import { getCalLink, getCalOrigin, fetchEventTitle } from "@/lib/cal/api";
import { parseMonthParam } from "@/lib/booking/time";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMetadata({
  title: "Book a Call",
  description:
    "Pick a time that suits you, in your own time zone, and we will confirm by email and WhatsApp. No calls software hidden behind a sign-up wall.",
  path: "/book-a-call",
});

function titleFromSlug(slug: string): string {
  const last = slug.split("/").filter(Boolean).pop() ?? "";
  return last
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

export default async function BookACallPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;

  const origin = getCalOrigin();
  const link = getCalLink();
  // Slug is the Cal.com event type key; the display name comes from Cal itself
  // so a rename in Cal.com shows up here without a redeploy.
  const eventTitle = (await fetchEventTitle()) ?? titleFromSlug(link) ?? "Book a Call";
  const calBookingUrl = origin && link ? `${origin}/${link}` : "/contact";

  return (
    <BookingPage
      initialMonth={parseMonthParam(month)}
      eventTitle={eventTitle}
      durationMinutes={30}
      calBookingUrl={calBookingUrl}
      showEmbedFallback={Boolean(origin && link)}
    />
  );
}