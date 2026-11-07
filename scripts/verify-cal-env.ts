import { loadEnvConfig } from "@next/env";
import { isCalConfigured, getCalOrigin, getCalLink } from "@/lib/cal/embed";
import { normalizeWhatsAppNumber, buildBusinessChatLink } from "@/lib/notify/whatsapp";

loadEnvConfig(process.cwd());

let pass = 0, fail = 0;
const ok = (name: string, cond: boolean) => (cond ? (pass++, console.log(`  PASS ${name}`)) : (fail++, console.log(`  FAIL ${name}`)));

console.log("\n[cal embed]");
ok("isCalConfigured() === true", isCalConfigured());
ok("calOrigin is bare origin", getCalOrigin() === "https://cal.com");
ok("calLink is slug only (no origin, no slash)", getCalLink() === "bilal-sheikh-3qvs54/deuvix");
console.log(`  -> iframe URL: ${getCalOrigin()}/${getCalLink()}/embed?embed=deuvix`);

console.log("\n[email + secrets present]");
for (const k of [
  "SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "EMAIL_FROM", "NOTIFY_EMAIL",
  "CAL_WEBHOOK_SECRET", "CRON_SECRET", "ADMIN_USER", "ADMIN_PASSWORD",
]) ok(`${k} set`, Boolean(process.env[k]));

ok("SMTP_PASS matches GMAIL_APP_PASSWORD", process.env.SMTP_PASS === process.env.GMAIL_APP_PASSWORD);
ok("SMTP_USER matches GMAIL_USER", process.env.SMTP_USER === process.env.GMAIL_USER);
ok("EMAIL_FROM uses the Deuvix AI Factory brand", (process.env.EMAIL_FROM ?? "").includes("Deuvix AI Factory"));

console.log("\n[whatsapp]");
const wa = normalizeWhatsAppNumber(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "");
ok("03423902897 normalizes to 923423902897", wa === "923423902897");
console.log(`  -> ${buildBusinessChatLink("Hi!")}`);

console.log("\n[db]");
if (process.env.DATABASE_URL) {
  ok("DATABASE_URL set", true);
} else {
  console.log("  SKIP DATABASE_URL is empty — run: winget install --id PostgreSQL.PostgreSQL -e, then npm run db:migrate");
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail > 0 ? 1 : 0);
