import type { Metadata } from "next";
import { BookingPage } from "@/components/booking/booking-page";
import { getCalLink, getCalOrigin } from "@/lib/cal/api";
import { pageMetadata } from "@/lib/seo";

// ISR: the page is static and refreshes at most once an hour. `?month=` is
// applied on the client after hydration, so the route needs no server render.
export const revalidate = 3600;

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

export default function BookACallPage() {
  const origin = getCalOrigin();
  const link = getCalLink();
  // Slug is the Cal.com event type key — humanise it as the display name.
  // No external Cal.com round-trip blocks the render; availability slots are
  // fetched client-side anyway.
  const eventTitle = titleFromSlug(link) ?? "Book a Call";
  const calBookingUrl = origin && link ? `${origin}/${link}` : "/contact";

  return (
    <BookingPage
      eventTitle={eventTitle}
      durationMinutes={30}
      calBookingUrl={calBookingUrl}
      showEmbedFallback={Boolean(origin && link)}
    />
  );
}