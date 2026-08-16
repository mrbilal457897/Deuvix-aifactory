export const ADMIN_EMAILS = ["sobber.id@gmail.com", "deuxaiinfo786@gmail.com"];

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && ADMIN_EMAILS.includes(email);
}
