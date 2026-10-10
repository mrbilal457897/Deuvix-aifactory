import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-emails";
import type { ToolContext } from "./tools/types";

export interface AdminAuthResult {
  ok: boolean;
  status?: number;
  error?: string;
  ctx?: ToolContext;
}

/**
 * Verifies the caller is a signed-in admin. Called on EVERY agent request; the
 * model never runs and no tool executes unless this passes. The agent inherits
 * exactly the admin's identity — it can never exceed that admin's permissions.
 */
export async function requireAdmin(): Promise<AdminAuthResult> {
  const session = await getServerSession(authOptions);
  const user = session?.user as
    | { email?: string | null; role?: string; userId?: string }
    | undefined;
  const email = (user?.email || "").trim();

  const isAdmin = Boolean(email) && (user?.role === "admin" || isAdminEmail(email));
  if (!isAdmin) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  return {
    ok: true,
    ctx: {
      adminId: user?.userId || email,
      adminEmail: email,
      role: "admin",
    },
  };
}
