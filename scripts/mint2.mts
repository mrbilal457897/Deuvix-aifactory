/** Mint admin + non-admin session tokens to verify /api/admin/tickets access. */
import { readFileSync } from "node:fs";
import { encode } from "next-auth/jwt";

const env = readFileSync(".env.local", "utf8");
const secret = env.match(/^NEXTAUTH_SECRET=(.*)$/m)?.[1]?.trim();
const lines = [];
for (const [email, label] of [
  ["team.deuvix@gmail.com", "ADMIN"],
  ["Bilal.Alee@gmail.com", "NONADMIN"],
]) {
  const token = await encode({ token: { email, sub: "s", role: label === "ADMIN" ? "admin" : "user" }, secret, maxAge: 3600 });
  lines.push(`${label}=${token}`);
}
console.log(lines.join("\n"));
process.exit(0);
