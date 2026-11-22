/**
 * One-off backfill: any CRM row mirrored from a confirmed Cal.com booking
 * should show Greeting = sent. Run with the site's Supabase env vars loaded.
 */
import { supabase } from "../src/lib/supabase";

async function main() {
  const { data, error } = await supabase
    .from("contacts")
    .update({ confirmation_sent: true, email_sent: true })
    .eq("service", "Book a Call")
    .select("id");

  if (error) {
    console.error("Backfill failed:", error.message);
    process.exit(1);
  }
  console.log(`Updated ${data?.length ?? 0} booking lead row(s).`);
}
main().catch((e) => {
  console.error("Backfill failed:", e?.name, String(e?.message).slice(0, 200));
  process.exit(1);
});
