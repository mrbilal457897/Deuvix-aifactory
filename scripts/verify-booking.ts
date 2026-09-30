import { signCalPayload, verifyCalSignature } from "@/lib/cal/signature";
import { calWebhookSchema, isHandledTrigger, normalizeCalBooking, triggerToStatus } from "@/lib/cal/payload";
import { bookingsToCsv } from "@/lib/bookings/queries";
import { normalizeWhatsAppNumber, buildWhatsAppLink } from "@/lib/notify/whatsapp";
import { ownerBookingEmail, clientBookingEmail } from "@/lib/email/booking-templates";

// The client email's "Chat on WhatsApp" button targets OUR number, not theirs.
process.env.NEXT_PUBLIC_WHATSAPP_NUMBER = "923001234567";

const SECRET = "s3cret";
let pass = 0, fail = 0;
const ok = (name: string, cond: boolean) => (cond ? (pass++, console.log(`  PASS ${name}`)) : (fail++, console.log(`  FAIL ${name}`)));

// --- 1. HMAC signature ---
console.log("\n[signature]");
const body = JSON.stringify({ triggerEvent: "BOOKING_CREATED" });
const sig = signCalPayload(body, SECRET);
ok("valid signature accepted", verifyCalSignature(body, sig, SECRET) === true);
ok("tampered body rejected", verifyCalSignature(body + " ", sig, SECRET) === false);
ok("wrong secret rejected", verifyCalSignature(body, sig, "other") === false);
ok("missing secret fails closed", verifyCalSignature(body, sig, undefined) === false);
ok("missing header rejected", verifyCalSignature(body, null, SECRET) === false);
ok("short/garbage header rejected", verifyCalSignature(body, "abc", SECRET) === false);
ok("sha256= prefix accepted", verifyCalSignature(body, "sha256=" + sig, SECRET) === true);
ok("uppercase hex accepted", verifyCalSignature(body, sig.toUpperCase(), SECRET) === true);

// --- 2. payload normalisation on a realistic Cal.com body ---
console.log("\n[payload]");
const real = {
  triggerEvent: "BOOKING_CREATED",
  createdAt: "2026-01-05T10:00:00.000Z",
  payload: {
    uid: "abc-123",
    title: "30min Discovery Call",
    startTime: "2026-02-10T06:00:00.000Z",
    endTime: "2026-02-10T06:30:00.000Z",
    timezone: "Europe/London",
    location: { type: "integrations:jitsi", link: "https://meet.jit.si/deux-abc" },
    attendees: [
      { name: "Ayesha Khan", email: "ayesha@example.com", timeZone: "Europe/London", phoneNumber: "+44 7700 900123" },
    ],
    bookingFieldsResponses: {
      company: "Northwind Ltd",
      notes: "Need an agent for <support> & billing",
      whatsapp: "+92 300 1234567",
    },
  },
};
const parsed = calWebhookSchema.safeParse(real);
ok("schema accepts real payload", parsed.success);
const n = normalizeCalBooking(parsed.data!);
ok("uid extracted", n.calUid === "abc-123");
ok("status from trigger", n.status === "confirmed");
ok("attendee tz wins over payload tz", n.timezone === "Europe/London");
ok("attendee name/email", n.name === "Ayesha Khan" && n.email === "ayesha@example.com");
ok("phone preferred over whatsapp field", n.whatsapp === "+44 7700 900123");
ok("company extracted", n.company === "Northwind Ltd");
ok("meeting url extracted", n.meetingUrl === "https://meet.jit.si/deux-abc");
ok("notes extracted", (n.notes ?? "").includes("billing"));

const noPhone = normalizeCalBooking(calWebhookSchema.parse({ triggerEvent: "BOOKING_CREATED", payload: { uid: "u2", startTime: "2026-02-10T06:00:00Z", endTime: "2026-02-10T06:30:00Z", bookingFieldsResponses: { whatsapp: "0300-1234567" } } }));
ok("falls back to booking-field phone", noPhone.whatsapp === "0300-1234567");

ok("cancelled trigger -> cancelled", triggerToStatus("BOOKING_CANCELLED") === "cancelled");
ok("rescheduled trigger -> rescheduled", triggerToStatus("BOOKING_RESCHEDULED") === "rescheduled");
ok("unknown trigger ignored", isHandledTrigger("BOOKING_CREATED") && !isHandledTrigger("PAYMENT_SUCCEEDED"));

try { normalizeCalBooking(calWebhookSchema.parse({ triggerEvent: "BOOKING_CREATED", payload: { startTime: "x", endTime: "y" } })); ok("missing uid throws", false); }
catch { ok("missing uid throws", true); }
try { normalizeCalBooking(calWebhookSchema.parse({ triggerEvent: "BOOKING_CREATED", payload: { uid: "u", startTime: "not-a-date", endTime: "x" } })); ok("bad date throws", false); }
catch { ok("bad date throws", true); }

// --- 3. WhatsApp normalisation ---
console.log("\n[whatsapp]");
ok("strips + and spaces", normalizeWhatsAppNumber("+44 7700 900123") === "447700900123");
ok("strips leading 00", normalizeWhatsAppNumber("00447700900123") === "447700900123");
ok("adds 92 to national 0300-1234567", normalizeWhatsAppNumber("0300-1234567") === "923001234567");
ok("strips trunk 0 before country code", normalizeWhatsAppNumber("+92 300 1234567") === "923001234567");
ok("rejects too short", normalizeWhatsAppNumber("12345") === null);
ok("rejects empty", normalizeWhatsAppNumber("") === null);
const wa = buildWhatsAppLink("+923001234567", "Hello & welcome");
ok("wa.me link built", wa?.startsWith("https://wa.me/923001234567?text=") === true);
// URLSearchParams encodes a space as "+" and "&" as "%26".
ok("message url-encoded", wa?.includes("Hello+%26+welcome") === true);

// --- 4. HTML escaping in emails ---
console.log("\n[email]");
const evil = {
  name: '<img src=x onerror=alert(1)>',
  email: "a@b.com",
  whatsapp: "923001234567",
  company: 'Acme "Ltd" & <b>Co</b>',
  notes: "<script>alert(2)</script>",
  eventTitle: "30min Call",
  startTime: new Date("2026-02-10T06:00:00Z"),
  endTime: new Date("2026-02-10T06:30:00Z"),
  timezone: "Europe/London",
  meetingUrl: "https://meet.jit.si/x",
};
const owner = ownerBookingEmail(evil, "new");
// Escaped text can still *contain* the word "onerror=" - what matters is that
// no live tag or attribute survives.
ok("owner html has no live <img>", !owner.html.includes("<img"));
ok("owner html has no live <script>", !owner.html.includes("<script"));
ok("owner html escaped company quotes", owner.html.includes("&quot;Ltd&quot;"));
const client = clientBookingEmail(evil, "new");
ok("client html has no live <script>", !client.html.includes("<script"));
ok("client html wa.me button -> our number", client.html.includes("wa.me/923001234567"));
ok("owner html has wa.me link", owner.html.includes("wa.me/923001234567"));
// The text/plain part is not HTML, so raw angle brackets are correct there.
ok("plain-text keeps raw chars, no html", owner.text.includes("<script>") && !owner.text.includes("&lt;"));
ok("javascript: url rejected", !ownerBookingEmail({ ...evil, meetingUrl: "javascript:alert(1)" }, "new").html.includes("javascript:"));
ok("status badge rendered", owner.html.includes("NEW"));
ok("cancelled badge", ownerBookingEmail(evil, "cancelled").html.includes("CANCELLED"));
ok("karachi time shown", owner.html.includes("Asia/Karachi"));

// --- 5. CSV injection guard ---
console.log("\n[csv]");
const csv = bookingsToCsv([{
  id: "1", calUid: "u1", status: "confirmed", eventTitle: "=cmd|'/c calc'!A1",
  startTime: new Date("2026-02-10T06:00:00Z"), endTime: new Date("2026-02-10T06:30:00Z"),
  timezone: "UTC", name: "+41712345678", email: "a@b.com", whatsapp: "923001234567",
  company: 'Acme, "Ltd"', notes: "line1\nline2", meetingUrl: "https://x.test", rawPayload: null,
  reminderSent: false, createdAt: new Date("2026-01-01T00:00:00Z"), updatedAt: new Date("2026-01-01T00:00:00Z"),
}]);
ok("formula neutralised with leading quote", csv.includes("'=cmd|'/c calc'!A1"));
ok("+ formula neutralised", csv.includes("'+41712345678"));
ok("comma+quote escaped", csv.includes('"Acme, ""Ltd"""'));
ok("newline quoted", csv.includes('"line1\nline2"'));
ok("BOM present", csv.charCodeAt(0) === 0xfeff);
ok("wa link in csv", csv.includes("wa.me/923001234567"));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);