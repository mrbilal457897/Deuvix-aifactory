/**
 * Emails that get admin access. Driven EXCLUSIVELY by the ADMIN_EMAILS env
 * var (comma-separated). If it is empty or unset, NOBODY is admin — deny all
 * rather than falling back to any built-in address. There is deliberately no
 * default admin email in this file.
 *
 * TODO(owner): set ADMIN_EMAILS in Vercel to exactly the admin emails you
 * intend to allow. Comparison is case-insensitive and trimmed.
 */
const configured: string[] = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((v) => v.trim().toLowerCase())
  .filter(Boolean);

export const ADMIN_EMAILS = configured;

function normalize(email: string | null | undefined): string {
  return (email || "").trim().toLowerCase();
}

export function isAdminEmail(email: string | null | undefined): boolean {
  const norm = normalize(email);
  return !!norm && ADMIN_EMAILS.includes(norm);
}
