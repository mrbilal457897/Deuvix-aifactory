import { randomBytes } from "crypto";
import { supabase } from "@/lib/supabase";

export const CONFIRM_TOKEN_HOURS = 48;

export type SubscriberStatus = "pending" | "confirmed" | "unsubscribed";

export interface Subscriber {
  id: string;
  email: string;
  status: SubscriberStatus;
  confirmToken: string | null;
  unsubscribeToken: string | null;
  source: string | null;
  createdAt: string;
  confirmedAt: string | null;
  unsubscribedAt: string | null;
}

function rowToSubscriber(row: Record<string, unknown>): Subscriber {
  return {
    id: row.id as string,
    email: row.email as string,
    status: row.status as SubscriberStatus,
    confirmToken: (row.confirm_token as string | null) ?? null,
    unsubscribeToken: (row.unsubscribe_token as string | null) ?? null,
    source: (row.source as string | null) ?? null,
    createdAt: row.created_at as string,
    confirmedAt: (row.confirmed_at as string | null) ?? null,
    unsubscribedAt: (row.unsubscribed_at as string | null) ?? null,
  };
}

/** Normalise before any storage or lookup: lowercase + trim. */
export function normaliseEmail(value: string): string {
  return value.trim().toLowerCase();
}

const DISPOSABLE_DOMAINS = [
  "mailinator.com", "guerrillamail.com", "tempmail.com", "10minutemail.com",
  "throwaway.email", "yopmail.com", "trashmail.com", "dispostable.com",
];

export function isDisposableEmail(email: string): boolean {
  const domain = email.split("@")[1] ?? "";
  return DISPOSABLE_DOMAINS.includes(domain);
}

export function newToken(): string {
  return randomBytes(32).toString("hex");
}

export async function findSubscriber(email: string): Promise<Subscriber | null> {
  const { data, error } = await supabase
    .from("newsletter_subscribers")
    .select("*")
    .eq("email", email)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? rowToSubscriber(data as Record<string, unknown>) : null;
}

export async function findByConfirmToken(token: string): Promise<Subscriber | null> {
  const { data, error } = await supabase
    .from("newsletter_subscribers")
    .select("*")
    .eq("confirm_token", token)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? rowToSubscriber(data as Record<string, unknown>) : null;
}

export async function findByUnsubscribeToken(token: string): Promise<Subscriber | null> {
  const { data, error } = await supabase
    .from("newsletter_subscribers")
    .select("*")
    .eq("unsubscribe_token", token)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? rowToSubscriber(data as Record<string, unknown>) : null;
}

export async function insertSubscriber(input: {
  email: string;
  confirmToken: string;
  unsubscribeToken: string;
  source: string;
}): Promise<Subscriber> {
  const { data, error } = await supabase
    .from("newsletter_subscribers")
    .insert({
      email: input.email,
      status: "pending",
      confirm_token: input.confirmToken,
      unsubscribe_token: input.unsubscribeToken,
      source: input.source,
    })
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not insert subscriber");
  return rowToSubscriber(data as Record<string, unknown>);
}

export async function restartSubscription(input: {
  id: string;
  confirmToken: string;
  unsubscribeToken: string;
}): Promise<Subscriber> {
  const { data, error } = await supabase
    .from("newsletter_subscribers")
    .update({
      status: "pending",
      confirm_token: input.confirmToken,
      unsubscribe_token: input.unsubscribeToken,
      confirmed_at: null,
      unsubscribed_at: null,
    })
    .eq("id", input.id)
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not restart subscription");
  return rowToSubscriber(data as Record<string, unknown>);
}

export async function confirmSubscriber(id: string): Promise<boolean> {
  const { error } = await supabase
    .from("newsletter_subscribers")
    .update({
      status: "confirmed",
      confirm_token: null,
      confirmed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "pending");
  return !error;
}

export async function unsubscribeSubscriber(id: string): Promise<boolean> {
  const { error } = await supabase
    .from("newsletter_subscribers")
    .update({
      status: "unsubscribed",
      unsubscribe_token: null,
      unsubscribed_at: new Date().toISOString(),
    })
    .eq("id", id);
  return !error;
}

/** All subscribers, newest first — used by the admin CRM page. */
export async function listSubscribers(): Promise<Subscriber[]> {
  const { data, error } = await supabase
    .from("newsletter_subscribers")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => rowToSubscriber(row as Record<string, unknown>));
}

/** Admin action: set a subscriber's status directly. */
export async function setSubscriberStatus(
  id: string,
  status: SubscriberStatus,
): Promise<boolean> {
  const { error } = await supabase
    .from("newsletter_subscribers")
    .update({ status })
    .eq("id", id);
  return !error;
}

export function isTokenExpired(createdAt: string): boolean {
  const age = Date.now() - new Date(createdAt).getTime();
  return age > CONFIRM_TOKEN_HOURS * 60 * 60 * 1000;
}
