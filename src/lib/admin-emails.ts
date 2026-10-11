import { company } from "@config/company";

/**
 * Emails that get admin role in auth. Driven by the ADMIN_EMAILS env var
 * (comma-separated). When unset it falls back to the known owners — the public
 * business email plus the founder account — so the dashboard keeps working
 * without env config.
 * TODO(owner): set ADMIN_EMAILS in Vercel to control exactly who has admin
 * access; the code default is only a safety net.
 */
const configured: string[] = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((v) => v.trim())
  .filter(Boolean);

const DEFAULT_ADMIN_EMAILS = [company.businessEmail, "sobber.id@gmail.com"];

export const ADMIN_EMAILS = configured.length ? configured : DEFAULT_ADMIN_EMAILS;

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && ADMIN_EMAILS.includes(email);
}
