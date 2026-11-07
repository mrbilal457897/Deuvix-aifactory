/**
 * Booking email templates. Pure functions — no env access, no I/O — so they
 * can be rendered in a script and eyeballed without a database.
 */
import {
  BRAND,
  FALLBACK_TIMEZONE,
  button,
  emailShell,
  escapeHtml,
  formatInTimezone,
  row,
  safeUrl,
  statusBadge,
  type BadgeTone,
} from "./layout";
import { buildBusinessChatLink, buildClientChatLink, buildConfirmMessage } from "@/lib/notify/whatsapp";

export interface BookingEmailData {
  name: string | null;
  email: string | null;
  whatsapp: string | null;
  company: string | null;
  notes: string | null;
  eventTitle: string | null;
  startTime: Date;
  endTime: Date;
  timezone: string | null;
  meetingUrl: string | null;
  rescheduleUrl?: string | null;
  cancelUrl?: string | null;
}

function multiline(value: string | null): string {
  if (!value) return '<span style="color:#9a9a9a;">—</span>';
  return escapeHtml(value).replace(/\r?\n/g, "<br>");
}

function durationLabel(start: Date, end: Date): string {
  const mins = Math.round((end.getTime() - start.getTime()) / 60000);
  if (!Number.isFinite(mins) || mins <= 0) return "—";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function whatsappCell(data: BookingEmailData): string {
  const link = buildClientChatLink(data.whatsapp, {
    name: data.name,
    startTime: data.startTime,
    meetingUrl: data.meetingUrl,
  });
  if (!link) {
    return data.whatsapp
      ? escapeHtml(data.whatsapp)
      : '<span style="color:#9a9a9a;">Not provided</span>';
  }
  return `<a href="${link}" style="color:${BRAND.primary};font-weight:600;text-decoration:none;" target="_blank" rel="noopener">${escapeHtml(data.whatsapp ?? "")} &rarr; Open WhatsApp</a>`;
}

/* ------------------------------------------------------------------ */
/* (a) Owner notification                                             */
/* ------------------------------------------------------------------ */

export function ownerBookingEmail(data: BookingEmailData, tone: BadgeTone): { subject: string; html: string; text: string } {
  const clientZone = data.timezone?.trim() || FALLBACK_TIMEZONE;
  const subjectPrefix =
    tone === "cancelled" ? "Cancelled" : tone === "rescheduled" ? "Rescheduled" : "New booking";
  const subject = `${subjectPrefix}: ${data.name ?? "Unknown"} — ${data.eventTitle ?? "Call"}`;

  const meetingUrl = safeUrl(data.meetingUrl);
  const waBusiness = buildBusinessChatLink(
    `Quick follow-up on the booking with ${data.name ?? "a client"}.`,
  );

  const html = emailShell({
    preheader: `${data.name ?? "Someone"} booked ${data.eventTitle ?? "a call"} for ${formatInTimezone(data.startTime, clientZone)}`,
    title: "Booking received",
    intro:
      tone === "cancelled"
        ? "A client cancelled their call."
        : tone === "rescheduled"
          ? "A client moved their call to a new time."
          : "A new call has been booked through the website.",
    content: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${statusBadge(tone)}
      ${row("Client", escapeHtml(data.name ?? "—"))}
      ${row("Email", data.email ? `<a href="mailto:${escapeHtml(data.email)}" style="color:${BRAND.primary};text-decoration:none;">${escapeHtml(data.email)}</a>` : "—")}
      ${row("WhatsApp", whatsappCell(data))}
      ${row("Company", multiline(data.company))}
      ${row("Event", escapeHtml(data.eventTitle ?? "—"))}
      ${row(
        "Time (client)",
        `${escapeHtml(formatInTimezone(data.startTime, clientZone))}<br><span style="font-size:12px;color:${BRAND.muted};">${escapeHtml(clientZone)}</span>`,
      )}
      ${row(
        `Time (${FALLBACK_TIMEZONE})`,
        `${escapeHtml(formatInTimezone(data.startTime, FALLBACK_TIMEZONE))}<br><span style="font-size:12px;color:${BRAND.muted};">Duration ${escapeHtml(durationLabel(data.startTime, data.endTime))}</span>`,
      )}
      ${meetingUrl ? row("Meeting", `<a href="${meetingUrl}" style="color:${BRAND.primary};text-decoration:none;" target="_blank" rel="noopener">Join meeting &rarr;</a>`) : ""}
      ${data.rescheduleUrl ? row("Reschedule", `<a href="${safeUrl(data.rescheduleUrl) ?? "#"}" style="color:${BRAND.primary};text-decoration:none;" target="_blank" rel="noopener">Reschedule link &rarr;</a>`) : ""}
      ${data.cancelUrl ? row("Cancel", `<a href="${safeUrl(data.cancelUrl) ?? "#"}" style="color:${BRAND.primary};text-decoration:none;" target="_blank" rel="noopener">Cancel link &rarr;</a>`) : ""}
      ${row("Notes", multiline(data.notes))}
    </table>
    <div style="margin:22px 0 0 0;display:flex;gap:10px;flex-wrap:wrap;">
      ${meetingUrl ? button(meetingUrl, "Join meeting") : ""}
      ${waBusiness ? button(waBusiness, "WhatsApp the client", BRAND.whatsapp, "#0F0F0B") : ""}
    </div>`,
  });

  const text = [
    `${subjectPrefix.toUpperCase()} — ${BRAND.name}`,
    "",
    `Client:      ${data.name ?? "—"}`,
    `Email:       ${data.email ?? "—"}`,
    `WhatsApp:    ${data.whatsapp ?? "—"}`,
    `WhatsApp link: ${buildClientChatLink(data.whatsapp, { name: data.name, startTime: data.startTime, meetingUrl: data.meetingUrl }) ?? "—"}`,
    `Company:     ${data.company ?? "—"}`,
    `Event:       ${data.eventTitle ?? "—"}`,
    `Time (client): ${formatInTimezone(data.startTime, clientZone)} (${clientZone})`,
    `Time (${FALLBACK_TIMEZONE}): ${formatInTimezone(data.startTime, FALLBACK_TIMEZONE)}`,
    `Duration:    ${durationLabel(data.startTime, data.endTime)}`,
    `Meeting:     ${data.meetingUrl ?? "—"}`,
    `Reschedule:  ${data.rescheduleUrl ?? "—"}`,
    `Cancel:      ${data.cancelUrl ?? "—"}`,
    "",
    "Notes:",
    data.notes ?? "—",
  ].join("\n");

  return { subject, html, text };
}

/* ------------------------------------------------------------------ */
/* (b) Client confirmation                                            */
/* ------------------------------------------------------------------ */

const CLIENT_COPY: Record<BadgeTone, { title: string; intro: string }> = {
  new: {
    title: "Your call is confirmed",
    intro: "Thanks for booking time with us. Details below.",
  },
  rescheduled: {
    title: "Your call has been rescheduled",
    intro: "Your booking was moved to a new time. The updated details are below.",
  },
  cancelled: {
    title: "Your call was cancelled",
    intro: "This booking no longer takes place. You are welcome to book again anytime.",
  },
};

export function clientBookingEmail(data: BookingEmailData, tone: BadgeTone): { subject: string; html: string; text: string } {
  const clientZone = data.timezone?.trim() || FALLBACK_TIMEZONE;
  const copy = CLIENT_COPY[tone];
  const subject =
    tone === "cancelled"
      ? `${BRAND.name}: your call was cancelled`
      : tone === "rescheduled"
        ? `${BRAND.name}: your call was rescheduled`
        : `${BRAND.name}: your call is confirmed`;

  const meetingUrl = safeUrl(data.meetingUrl);
  const waBusiness = buildBusinessChatLink(
    buildConfirmMessage({ name: data.name, startTime: data.startTime, meetingUrl: data.meetingUrl }),
  );
  const rescheduleUrl = safeUrl(data.rescheduleUrl);
  const cancelUrl = safeUrl(data.cancelUrl);

  const html = emailShell({
    preheader: copy.title,
    title: copy.title,
    intro: copy.intro,
    content: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${statusBadge(tone)}
      ${row("When", `${escapeHtml(formatInTimezone(data.startTime, clientZone))}<br><span style="font-size:12px;color:${BRAND.muted};">${escapeHtml(clientZone)}</span>`)}
      ${row("Duration", escapeHtml(durationLabel(data.startTime, data.endTime)))}
      ${row("With", escapeHtml(data.eventTitle ?? BRAND.name))}
    </table>
    <div style="margin:22px 0 0 0;display:flex;gap:10px;flex-wrap:wrap;">
      ${meetingUrl && tone !== "cancelled" ? button(meetingUrl, "Join meeting") : ""}
      ${waBusiness ? button(waBusiness, "Chat on WhatsApp", BRAND.whatsapp, "#0F0F0B") : ""}
    </div>
    ${
      rescheduleUrl || cancelUrl
        ? `<p style="margin:20px 0 0 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:13px;color:${BRAND.muted};line-height:1.7;">
             Need to change something?
             ${rescheduleUrl ? `<a href="${rescheduleUrl}" style="color:${BRAND.primary};">Reschedule</a>` : ""}
             ${rescheduleUrl && cancelUrl ? " or " : ""}
             ${cancelUrl ? `<a href="${cancelUrl}" style="color:${BRAND.primary};">cancel this booking</a>` : ""}.
           </p>`
        : ""
    }`,
  });

  const text = [
    `${BRAND.name} — ${copy.title}`,
    "",
    `When:     ${formatInTimezone(data.startTime, clientZone)} (${clientZone})`,
    `Duration: ${durationLabel(data.startTime, data.endTime)}`,
    `Meeting:  ${data.meetingUrl ?? "—"}`,
    waBusiness ? `WhatsApp: ${waBusiness}` : "",
    rescheduleUrl ? `Reschedule: ${rescheduleUrl}` : "",
    cancelUrl ? `Cancel: ${cancelUrl}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html, text };
}

/* ------------------------------------------------------------------ */
/* (c) 24-hour reminder                                               */
/* ------------------------------------------------------------------ */

export function bookingReminderEmail(
  data: BookingEmailData,
  audience: "client" | "owner",
): { subject: string; html: string; text: string } {
  const clientZone = data.timezone?.trim() || FALLBACK_TIMEZONE;

  if (audience === "client") {
    const meetingUrl = safeUrl(data.meetingUrl);
    const waBusiness = buildBusinessChatLink(
      `Reminder: my call with Deuvix AI Factory is at ${formatInTimezone(data.startTime, clientZone)}.`,
    );

    return {
      subject: `Reminder: your call with ${BRAND.name} is tomorrow`,
      html: emailShell({
        preheader: "Your call is coming up",
        title: "Your call is coming up",
        intro: "A quick reminder that your call is scheduled for tomorrow.",
        content: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${row("When", `${escapeHtml(formatInTimezone(data.startTime, clientZone))}<br><span style="font-size:12px;color:${BRAND.muted};">${escapeHtml(clientZone)}</span>`)}
          ${row("With", escapeHtml(data.eventTitle ?? BRAND.name))}
        </table>
        <div style="margin:22px 0 0 0;display:flex;gap:10px;flex-wrap:wrap;">
          ${meetingUrl ? button(meetingUrl, "Join meeting") : ""}
          ${waBusiness ? button(waBusiness, "Chat on WhatsApp", BRAND.whatsapp, "#0F0F0B") : ""}
        </div>`,
      }),
      text: [
        `Reminder from ${BRAND.name}`,
        "",
        `When:     ${formatInTimezone(data.startTime, clientZone)} (${clientZone})`,
        `Meeting:  ${data.meetingUrl ?? "—"}`,
        waBusiness ? `WhatsApp: ${waBusiness}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    };
  }

  const waClient = buildClientChatLink(data.whatsapp, {
    name: data.name,
    startTime: data.startTime,
    meetingUrl: data.meetingUrl,
  });

  return {
    subject: `Reminder: ${data.name ?? "client"} has a call in ~24h`,
    html: emailShell({
      preheader: "Upcoming call in ~24 hours",
      title: "Upcoming call in ~24 hours",
      intro: "Still confirmed and not yet sent to the client.",
      content: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${row("Client", escapeHtml(data.name ?? "—"))}
        ${row("Email", escapeHtml(data.email ?? "—"))}
        ${row("WhatsApp", whatsappCell(data))}
        ${row("Time (client)", `${escapeHtml(formatInTimezone(data.startTime, clientZone))}<br><span style="font-size:12px;color:${BRAND.muted};">${escapeHtml(clientZone)}</span>`)}
        ${row(`Time (${FALLBACK_TIMEZONE})`, escapeHtml(formatInTimezone(data.startTime, FALLBACK_TIMEZONE)))}
      </table>
      <div style="margin:22px 0 0 0;display:flex;gap:10px;flex-wrap:wrap;">
        ${waClient ? button(waClient, "WhatsApp the client", BRAND.whatsapp, "#0F0F0B") : ""}
      </div>`,
    }),
    text: [
      `24h reminder — ${BRAND.name}`,
      "",
      `Client:    ${data.name ?? "—"}`,
      `Email:     ${data.email ?? "—"}`,
      `WhatsApp:  ${data.whatsapp ?? "—"}`,
      `When:      ${formatInTimezone(data.startTime, clientZone)} (${clientZone})`,
      waClient ? `WhatsApp link: ${waClient}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}
