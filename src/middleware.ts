import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { isAdminEmail } from "@/lib/admin-emails";

const DASHBOARD_PREFIX = process.env.DASHBOARD_PREFIX || "/deux";

/**
 * Constant-time string compare.
 * Middleware runs on the edge runtime where `node:crypto` is unavailable, so we
 * cannot use timingSafeEqual here. This walks both strings fully and folds the
 * difference into one accumulator, which keeps the comparison time independent
 * of where the first mismatch is.
 */
function constantTimeEquals(a: string, b: string): boolean {
  const max = Math.max(a.length, b.length);
  let diff = a.length === b.length ? 0 : 1;
  for (let i = 0; i < max; i += 1) {
    diff |= (a.charCodeAt(i) | 0) ^ (b.charCodeAt(i) | 0);
  }
  return diff === 0;
}

/** HTTP Basic Auth gate for the bookings admin area and its CSV endpoint. */
function withBasicAuth(request: NextRequest): NextResponse {
  const user = process.env.ADMIN_USER;
  const password = process.env.ADMIN_PASSWORD;

  if (!user || !password) {
    return new NextResponse("Bookings admin is not configured (ADMIN_USER / ADMIN_PASSWORD).", {
      status: 503,
    });
  }

  const header = request.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    const decoded = atob(header.slice(6));
    const separator = decoded.indexOf(":");
    if (separator > -1) {
      const candidateUser = decoded.slice(0, separator);
      const candidatePass = decoded.slice(separator + 1);
      if (
        constantTimeEquals(candidateUser, user) &&
        constantTimeEquals(candidatePass, password)
      ) {
        return NextResponse.next();
      }
    }
  }

  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="DEUX Bookings", charset="UTF-8"' },
  });
}

export async function middleware(request: NextRequest) {
  let token: Awaited<ReturnType<typeof getToken>> | null = null;
  try {
    token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  } catch {
    token = null;
  }
  const { pathname } = request.nextUrl;

  const isApiAuth = pathname.startsWith("/api/auth");
  const isPublicApi = pathname.startsWith("/api/projects") && request.method === "GET";
  const isFetchOg = pathname.startsWith("/api/fetch-og");
  const isChat = pathname.startsWith("/api/chat");
  const isContact = pathname.startsWith("/api/contact");
  const isSiteConfigGet = pathname.startsWith("/api/site-config") && request.method === "GET";
  const isProxyImage = pathname.startsWith("/api/proxy-image");
  // Cal.com signs these with its own HMAC / CRON_SECRET - never with a session.
  const isCalWebhook = pathname === "/api/cal/webhook";
  const isCronReminders = pathname === "/api/cron/reminders";
  const isCronFollowUpReminders = pathname === "/api/cron/follow-up-reminders";
  // The booking page is public by definition: anyone may read availability or
  // book. Both routes keep CAL_API_KEY server-side and /book is rate-limited.
  const isCalSlots = pathname === "/api/cal/slots" && request.method === "GET";
  const isCalBook = pathname === "/api/cal/book" && request.method === "POST";

  // Bookings admin has its own credential pair, checked before the
  // next-auth gate so these routes do not need a logged-in session.
  const isBookingsAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  // The AI agent API also lives under /api/admin, but it is guarded by next-auth
  // admin sessions inside its own routes (requireAdmin) — NOT by the bookings
  // Basic auth. Exempt it so the dashboard does not raise a browser login prompt.
  const isAgentApi = pathname.startsWith("/api/admin/agent");
  const isBookingsAdminApi = pathname.startsWith("/api/admin") && !isAgentApi;
  if (isBookingsAdmin || isBookingsAdminApi) {
    return withBasicAuth(request);
  }

  if (
    isApiAuth ||
    isPublicApi ||
    isFetchOg ||
    isChat ||
    isContact ||
    isSiteConfigGet ||
    isProxyImage ||
    isCalWebhook ||
    isCronReminders ||
    isCronFollowUpReminders ||
    isCalSlots ||
    isCalBook
  ) {
    return NextResponse.next();
  }

  const isApi = pathname.startsWith("/api/");

  // Match dashboard routes: exact prefix, prefix/sub, or legacy /dashboard
  const isDashboard =
    pathname === DASHBOARD_PREFIX ||
    pathname.startsWith(DASHBOARD_PREFIX + "/") ||
    pathname.startsWith("/dashboard");
  const isLegacyDashboard = pathname.startsWith("/dashboard");

  const isAdmin = token ? isAdminEmail(token.email as string) : false;

  if (isApi) {
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.next();
  }

  if (isLegacyDashboard) {
    if (!token) {
      const login = new URL("/login", request.url);
      login.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(login);
    }
    if (!isAdmin) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.redirect(new URL(`${DASHBOARD_PREFIX}${pathname.slice("/dashboard".length)}`, request.url));
  }

  if (isDashboard) {
    if (!token) {
      const login = new URL("/login", request.url);
      login.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(login);
    }
    if (!isAdmin) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/:path*",
    "/admin/:path*",
    "/admin",
    "/dashboard/:path*",
    "/dashboard",
    "/deux/:path*",
    "/deux",
  ],
};
