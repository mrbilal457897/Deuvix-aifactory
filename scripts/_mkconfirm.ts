import { supabase } from "../src/lib/supabase";
import { insertSubscriber, newToken } from "../src/lib/newsletter";
const email = `confirm-page-${Date.now()}@example.invalid`;
(async () => {
  const confirmToken = newToken();
  const unsubscribeToken = newToken();
  await insertSubscriber({ email, confirmToken, unsubscribeToken, source: "test" });
  console.log(`${email} ${confirmToken} ${unsubscribeToken}`);
})();
