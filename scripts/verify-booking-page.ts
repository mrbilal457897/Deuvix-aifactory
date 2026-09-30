import {
  addMinutes,
  addMonths,
  formatTimeInZone,
  isValidTimeZone,
  monthDateKeys,
  monthLabel,
  parseMonthParam,
  zonedTimeToUtcISO,
} from "@/lib/booking/time";
import { getCalApiBase, parseCalLink } from "@/lib/cal/api";
import { rateLimit } from "@/lib/booking/rate-limit";

let pass = 0,
  fail = 0;
const ok = (name: string, cond: boolean) =>
  cond ? (pass++, console.log(`  PASS ${name}`)) : (fail++, console.log(`  FAIL ${name}`));

console.log("\n[zoned -> UTC conversion]");
// Pakistan is a fixed UTC+5 with no DST.
ok("Karachi 09:00 -> 04:00Z", zonedTimeToUtcISO("2026-10-05", "09:00", "Asia/Karachi") === "2026-10-05T04:00:00.000Z");
ok("Karachi midnight -> previous 19:00Z", zonedTimeToUtcISO("2026-10-05", "00:00", "Asia/Karachi") === "2026-10-04T19:00:00.000Z");

// India is UTC+5:30, which catches naive "just subtract 5" logic.
ok("Kolkata 09:00 -> 03:30Z (half-hour zone)", zonedTimeToUtcISO("2026-10-05", "09:00", "Asia/Kolkata") === "2026-10-05T03:30:00.000Z");
ok("Kolkata 23:30 -> 18:00Z", zonedTimeToUtcISO("2026-10-05", "23:30", "Asia/Kolkata") === "2026-10-05T18:00:00.000Z");

// Southern hemisphere DST: Sydney is UTC+11 in October (AEDT).
ok("Sydney 09:00 -> 22:00Z previous day (DST +11)", zonedTimeToUtcISO("2026-10-05", "09:00", "Australia/Sydney") === "2026-10-04T22:00:00.000Z");
// ...and UTC+10 in June (AEST), one month later. A hardcoded offset would fail here.
ok("Sydney 09:00 in June -> 23:00Z previous day (DST +10)", zonedTimeToUtcISO("2026-06-05", "09:00", "Australia/Sydney") === "2026-06-04T23:00:00.000Z");

// US DST transitions in 2026: 8 Mar and 1 Nov.
ok("New York 09:00 Mar 5 (EST, -5)", zonedTimeToUtcISO("2026-03-05", "09:00", "America/New_York") === "2026-03-05T14:00:00.000Z");
ok("New York 09:00 Mar 20 (EDT, -4)", zonedTimeToUtcISO("2026-03-20", "09:00", "America/New_York") === "2026-03-20T13:00:00.000Z");

ok("UTC is identity", zonedTimeToUtcISO("2026-10-05", "09:00", "UTC") === "2026-10-05T09:00:00.000Z");

// Round-trip: UTC -> wall clock -> UTC must be lossless.
// The helper takes the LOCAL date, which is exactly what Cal.com's slot map is
// keyed by. Using the UTC date here would be wrong wherever the local time has
// crossed midnight relative to UTC (Sydney +11 is the obvious case).
for (const tz of ["Asia/Karachi", "Asia/Kolkata", "America/New_York", "Australia/Sydney", "Europe/Paris"]) {
  const iso = "2026-10-15T13:45:00.000Z";
  const localDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
  const back = zonedTimeToUtcISO(localDate, formatTimeInZone(iso, tz), tz);
  ok(`round-trip ${tz}`, back === iso);
}

console.log("\n[month math]");
ok("parseMonthParam valid", parseMonthParam("2026-10") === "2026-10-01");
ok("parseMonthParam junk falls back", /^\d{4}-\d{2}-01$/.test(parseMonthParam("nonsense")));
ok("Oct 2026 has 31 days", monthDateKeys("2026-10").length === 31);
ok("Feb 2026 has 28 days", monthDateKeys("2026-02").length === 28);
ok("Feb 2028 leap has 29 days", monthDateKeys("2028-02").length === 29);
ok("Oct starts and ends correctly", (() => {
  const k = monthDateKeys("2026-10");
  return k[0] === "2026-10-01" && k[k.length - 1] === "2026-10-31";
})());
ok("addMonths +1 rolls the year", addMonths("2026-12", 1) === "2027-01");
ok("addMonths -1 rolls back a year", addMonths("2026-01", -1) === "2025-12");
ok("monthLabel", monthLabel("2026-10") === "October 2026");

console.log("\n[cal link parsing]");
delete process.env.CAL_EVENT_KIND;
delete process.env.CAL_ORGANIZATION_SLUG;
ok("user/slug", (() => {
  const r = parseCalLink("bilal-sheikh-3qvs54/deux");
  return r?.username === "bilal-sheikh-3qvs54" && r?.eventTypeSlug === "deux";
})());
ok("bare slug has no username", (() => {
  const r = parseCalLink("deux");
  return r?.eventTypeSlug === "deux" && r?.username === undefined;
})());
ok("leading/trailing slashes tolerated", (() => {
  const r = parseCalLink("/bilal-sheikh-3qvs54/deux/");
  return r?.username === "bilal-sheikh-3qvs54" && r?.eventTypeSlug === "deux";
})());
ok("literal team/ prefix strips the prefix", (() => {
  const r = parseCalLink("team/acme/intro");
  return r?.teamSlug === "acme" && r?.eventTypeSlug === "intro" && r?.username === undefined;
})());
// The ambiguous two-segment form must follow config, not a guess.
process.env.CAL_EVENT_KIND = "team";
ok("two segments + CAL_EVENT_KIND=team -> teamSlug", (() => {
  const r = parseCalLink("acme/intro");
  return r?.teamSlug === "acme" && r?.eventTypeSlug === "intro" && r?.username === undefined;
})());
process.env.CAL_EVENT_KIND = "user";
ok("two segments + CAL_EVENT_KIND=user -> username", (() => {
  const r = parseCalLink("acme/intro");
  return r?.username === "acme" && r?.teamSlug === undefined;
})());
ok("explicit team/ wins over CAL_EVENT_KIND=user", (() => {
  const r = parseCalLink("team/acme/intro");
  return r?.teamSlug === "acme" && r?.username === undefined;
})());
process.env.CAL_ORGANIZATION_SLUG = "acme-corp";
ok("organization slug is threaded through", parseCalLink("bob/intro")?.organizationSlug === "acme-corp");
delete process.env.CAL_ORGANIZATION_SLUG;
delete process.env.CAL_EVENT_KIND;
ok("empty link returns null", parseCalLink("") === null);

console.log("\n[api base derivation]");
process.env.NEXT_PUBLIC_CAL_ORIGIN = "https://cal.com";
ok("hosted cal.com -> api.cal.com", getCalApiBase() === "https://api.cal.com");
process.env.NEXT_PUBLIC_CAL_ORIGIN = "https://cal.example.com";
ok("self-hosted -> <origin>/api", getCalApiBase() === "https://cal.example.com/api");
process.env.NEXT_PUBLIC_CAL_ORIGIN = "https://cal.com/";
ok("trailing slash tolerated", getCalApiBase() === "https://api.cal.com");
process.env.NEXT_PUBLIC_CAL_ORIGIN = "https://cal.com";

console.log("\n[rate limiter]");
{
  const key = `test:${Math.random()}`;
  let allowed = 0;
  for (let i = 0; i < 8; i += 1) if (rateLimit(key, 5).ok) allowed += 1;
  ok("allows exactly the limit then blocks", allowed === 5);
  ok("separate keys are independent", rateLimit(`${key}:other`, 5).ok === true);
}

console.log("\n[timezone validation]");
ok("valid zone accepted", isValidTimeZone("Asia/Karachi") === true);
ok("garbage rejected", isValidTimeZone("Not/AZone") === false);

console.log("\n[duration]");
ok("addMinutes", addMinutes("2026-10-05T04:00:00.000Z", 30) === "2026-10-05T04:30:00.000Z");

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail > 0 ? 1 : 0);