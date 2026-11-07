/**
 * Compile-time proof that summariseClients collapses repeat submissions and
 * reports the newest row as "last contact". Run with:
 *   node --experimental-strip-types scripts/check-crm.ts
 */
import { summariseClients, summariseFollowUps, countFollowUps, isInternalAddress, followUpMailto } from "../src/lib/crm.ts";
import type { Contact } from "../src/lib/contacts.ts";
import type { Lead } from "../src/lib/leads.ts";
import type { FollowUp } from "../src/lib/follow-ups.ts";

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) console.log(`      expected ${JSON.stringify(expected)}\n      actual   ${JSON.stringify(actual)}`);
}

const c = (over: Partial<Contact>): Contact => ({
  id: "x", name: "n", email: "a@b.com", phone: "", service: "AI Chatbots",
  message: "m", createdAt: "2026-01-01T00:00:00.000+00:00", ...over,
});
const l = (over: Partial<Lead>): Lead => ({
  id: "l", name: "n", email: "a@b.com", phone: "", service: "AI Chatbots",
  message: "m", score: 9, status: "hot", priority: "high",
  createdAt: "2026-01-01T00:00:00.000+00:00", ...over,
});
const f = (over: Partial<FollowUp>): FollowUp => ({
  id: "f", leadId: "l", email: "a@b.com", name: "n",
  dueAt: "2026-01-01T00:00:00.000+00:00", channel: "email",
  subject: "s", body: "b", status: "pending",
  createdAt: "2026-01-01T00:00:00.000+00:00", ...over,
});

console.log("== 11 contacts, 7 unique emails -> 7 client rows ==");
const contacts: Contact[] = [
  c({ id: "1", email: "asad@x.com", createdAt: "2026-08-18T19:22:40.804+00:00" }),
  c({ id: "2", email: "ASAD@x.com", createdAt: "2026-09-30T19:16:26.000+00:00", service: "Voice Agents" }),
  c({ id: "3", email: "ali@x.com", createdAt: "2026-08-19T10:00:00.000+00:00" }),
  c({ id: "4", email: "bob@x.com", createdAt: "2026-08-20T10:00:00.000+00:00" }),
  c({ id: "5", email: "cat@x.com", createdAt: "2026-08-20T11:00:00.000+00:00" }),
  c({ id: "6", email: "dan@x.com", createdAt: "2026-08-20T12:00:00.000+00:00" }),
  c({ id: "7", email: "eve@x.com", createdAt: "2026-08-20T13:00:00.000+00:00" }),
  c({ id: "8", email: "fin@x.com", createdAt: "2026-08-20T14:00:00.000+00:00" }),
  c({ id: "9", email: "asad@x.com", createdAt: "2026-08-25T09:00:00.000+00:00" }),
];
const rows = summariseClients(contacts, [l({ email: "asad@x.com", score: 8, status: "hot" })], []);
check("row count is per-unique-email", rows.length, 7);
const asad = rows.find((r) => r.email === "asad@x.com");
check("case-insensitive grouping", Boolean(asad), true);
check("contactCount counts submissions", asad?.contactCount, 3);
check("lastContactAt is newest", asad?.lastContactAt, "2026-09-30T19:16:26.000Z");
check("firstContactAt is oldest", asad?.firstContactAt, "2026-08-18T19:22:40.804Z");
check("service from newest row", asad?.service, "Voice Agents");
check("score joined from leads", asad?.score, 8);
check("sorted newest first", rows[0].lastContactAt >= rows[rows.length - 1].lastContactAt, true);

console.log("\n== nullable when no lead row ==");
const noLead = summariseClients([c({ email: "solo@x.com" })], [], []);
check("score null without lead", noLead[0].score, null);
check("status null without lead", noLead[0].status, null);

console.log("\n== greeting flags ==");
const flagged = summariseClients(
  [c({ email: "g@x.com", emailSent: true, confirmationSent: false })], [], [],
);
check("greetingSent false", flagged[0].greetingSent, false);
check("notificationSent true", flagged[0].notificationSent, true);

console.log("\n== follow-up dedup: 3 identical rows -> 1 ==");
const followUps: FollowUp[] = [
  f({ id: "f1", email: "t@x.com", subject: "Following up on your Deuvix inquiry", dueAt: "2026-08-22T00:00:00.000+00:00" }),
  f({ id: "f2", email: "t@x.com", subject: "Following up on your Deuvix inquiry", dueAt: "2026-08-22T00:00:00.000+00:00" }),
  f({ id: "f3", email: "t@x.com", subject: "Following up on your Deuvix inquiry", dueAt: "2026-08-22T00:00:00.000+00:00" }),
  f({ id: "f4", email: "t@x.com", subject: "Different subject", dueAt: "2026-08-21T00:00:00.000+00:00" }),
  f({ id: "f5", email: "t@x.com", subject: "Resolved one", status: "done", dueAt: "2026-08-20T00:00:00.000+00:00" }),
];
const fu = summariseFollowUps(followUps, new Date("2026-10-01T00:00:00.000Z"));
check("pending groups only", fu.length, 2);
const dup = fu.find((r) => r.subject === "Following up on your Deuvix inquiry");
check("duplicateCount is 3", dup?.duplicateCount, 3);
check("duplicateIds clears all 3", dup?.duplicateIds.sort(), ["f1", "f2", "f3"]);
check("most overdue represents group", fu[0].subject, "Different subject");
check("done rows excluded", fu.some((r) => r.subject === "Resolved one"), false);
check("overdue flagged", dup?.overdue, true);

console.log("\n== counts ==");
const counts = countFollowUps(followUps, new Date("2026-10-01T00:00:00.000Z"));
check("pending = 4", counts.pending, 4);
check("overdue = 4", counts.overdue, 4);
check("done = 1", counts.done, 1);
check("skipped = 0", counts.skipped, 0);

console.log("\n== internal / test addresses hidden ==");
check("test@ is internal", isInternalAddress("test@example.com"), true);
check("example.org is internal", isInternalAddress("a@EXAMPLE.org"), true);
check("sobber is internal", isInternalAddress("sobber11.id@gmail.com"), true);
check("bilal is internal", isInternalAddress("bilal.457897@gmail.com"), true);
check("real client is not internal", isInternalAddress("ansaribest477@gmail.com"), false);
check("internal flag on row", summariseFollowUps([f({ id: "i", email: "test@example.com" })])[0].isInternal, true);

console.log("\n== mailto draft ==");
const mailto = followUpMailto({ email: "a@b.com", subject: "Hi there", body: "line1\nline2" });
check("mailto prefix", mailto.startsWith("mailto:a@b.com?subject="), true);
check("newlines encoded", mailto.includes("%0A"), true);
check("space encoded", mailto.includes("%20"), true);

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);