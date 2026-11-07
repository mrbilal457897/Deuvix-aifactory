import type { Metadata } from "next";
import { BookingPage } from "@/components/booking/booking-page";
import { getCalLink, getCalOrigin } from "@/lib/cal/api";
import { parseMonthParam } from "@/lib/booking/time";

export const dynamic = "force-dynamic";

const TITLE = "Book a Call";

export const metadata: Metadata = {
  title: `${TITLE} | Deuvix AI Factory`,
  description:
    "Pick a time that suits you, in your own time zone, and we will confirm by email and WhatsApp. No calls software hidden behind a sign-up wall.",
  alternates: { canonical: "/book-a-call" },
  openGraph: {
    title: `${TITLE} | Deuvix AI Factory`,
    description: "Pick a time that suits you, in your time zone. Confirmation by email and WhatsApp.",
    url: "/book-a-call",
  },
};

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
  const eventTitle = titleFromSlug(link) || TITLE;
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