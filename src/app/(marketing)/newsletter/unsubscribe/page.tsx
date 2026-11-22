import { redirect } from "next/navigation";
import { findByUnsubscribeToken, unsubscribeSubscriber } from "@/lib/newsletter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public one-click unsubscribe link used in every newsletter email. */
export default async function UnsubscribeLinkPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) redirect("/newsletter/invalid");

  const subscriber = await findByUnsubscribeToken(token);
  if (!subscriber || !subscriber.unsubscribeToken || subscriber.unsubscribeToken !== token) {
    redirect("/newsletter/invalid");
  }
  const ok = await unsubscribeSubscriber(subscriber.id);
  if (!ok) redirect("/newsletter/invalid");
  redirect("/newsletter/unsubscribed");
}
