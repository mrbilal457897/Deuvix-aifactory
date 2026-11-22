/**
 * Scripted check for the newsletter system. Run with Supabase env vars loaded:
 *   npx tsx scripts/test-newsletter.ts
 * Uses a unique test address and deletes it afterwards.
 */
import {
  confirmSubscriber,
  findByConfirmToken,
  findByUnsubscribeToken,
  findSubscriber,
  insertSubscriber,
  isDisposableEmail,
  isTokenExpired,
  newToken,
  normaliseEmail,
  restartSubscription,
  unsubscribeSubscriber,
} from "../src/lib/newsletter";

const email = `newsletter-test-${Date.now()}@example.invalid`;

function check(name: string, condition: boolean) {
  console.log(`${condition ? "PASS" : "FAIL"}  ${name}`);
  if (!condition) process.exitCode = 1;
}

async function main() {
  check("normalise lowercase + trim", normaliseEmail("  Test@Example.COM ") === "test@example.com");
  check("disposable domain rejected", isDisposableEmail("a@mailinator.com"));
  check("normal domain accepted", !isDisposableEmail("a@example.com"));
  const token = newToken();
  check("token is 64 hex chars", /^[a-f0-9]{64}$/.test(token));
  check("fresh token not expired", !isTokenExpired(new Date().toISOString()));
  check("old token expired", isTokenExpired(new Date(Date.now() - 49 * 3600_000).toISOString()));

  const confirmToken = newToken();
  const unsubscribeToken = newToken();
  const row = await insertSubscriber({ email, confirmToken, unsubscribeToken, source: "test" });
  check("insert pending", row.status === "pending" && row.email === email);
  check("find by email", (await findSubscriber(email))?.id === row.id);
  check("find by confirm token", (await findByConfirmToken(confirmToken))?.id === row.id);
  check("find by unsubscribe token", (await findByUnsubscribeToken(unsubscribeToken))?.id === row.id);

  // Re-subscribe rotates tokens and stays pending.
  const rotated = await restartSubscription({
    id: row.id,
    confirmToken: newToken(),
    unsubscribeToken: newToken(),
  });
  check("resubscribe rotates token", rotated.confirmToken !== confirmToken);
  check("old token no longer resolves", (await findByConfirmToken(confirmToken)) === null);

  check("confirm pending row", await confirmSubscriber(rotated.id));
  check("status confirmed", (await findSubscriber(email))?.status === "confirmed");
  check("confirm removes token", (await findByConfirmToken(rotated.confirmToken as string)) === null);

  check("unsubscribe confirmed row", await unsubscribeSubscriber(rotated.id));
  check("status unsubscribed", (await findSubscriber(email))?.status === "unsubscribed");

  // Cleanup by email (token was cleared on unsubscribe).
  const { supabase } = await import("../src/lib/supabase");
  await supabase.from("newsletter_subscribers").delete().eq("email", email);
  console.log("cleanup done");
}
main().catch((e) => {
  console.error("ERROR", e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
