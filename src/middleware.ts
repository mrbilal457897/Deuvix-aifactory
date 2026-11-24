import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { isAdminEmail } from "@/lib/admin-emails";
import { wantsMarkdown } from "@/lib/markdown/accept";
import { markdownAlternate, markdownSourcePath } from "@/lib/markdown/paths";

const DASHBOARD_PREFIX = process.env.DASHBOARD_PREFIX || "/deuvix";

/**
 * Files served from /public do not go through a route handler — the platform
 * answers unsupported methods with 501. Answer with a proper 405 instead.
 */
const STATIC_FILE_PATH = /\.(txt|ico|svg|png|jpe?g|webp|gif|woff2?|css|js|pdf)$/i;

function isPublicStaticPath(pathname: string): boolean {
  if (!STATIC_FILE_PATH.test(pathname)) return false;
  return !pathname.startsWith("/api/") && !pathname.startsWith("/_next/") && !pathname.startsWith("/.well-known/");
}

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
    headers: { "WWW-Authenticate": 'Basic realm="Deuvix Bookings", charset="UTF-8"' },
  });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicStaticPath(pathname)) {
    const allow = { Allow: "GET, HEAD, OPTIONS" };
    if (request.method === "OPTIONS") {
      return new NextResponse(null, { status: 204, headers: allow });
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new NextResponse(null, { status: 405, headers: allow });
    }
  }

  // Content negotiation. An explicit text/markdown preference (q >= text/html)
  // rewrites to the Markdown handler without changing the visible URL.
  // Browsers, `*/*` and everything else keep the normal HTML response.
  if (request.method === "GET" || request.method === "HEAD") {
    const sourcePath = markdownSourcePath(pathname);
    // A .md URL is an explicit request for Markdown, whatever the Accept header.
    const explicitMd = pathname.endsWith(".md");
    if (sourcePath && (explicitMd || wantsMarkdown(request.headers.get("accept")))) {
      const mdUrl = new URL("/api/md", request.url);
      mdUrl.searchParams.set("path", sourcePath);
      const headers = new Headers(request.headers);
      headers.set("x-md-path", sourcePath);
      return NextResponse.rewrite(mdUrl, { request: { headers } });
    }
  }

  let token: Awaited<ReturnType<typeof getToken>> | null = null;
  try {
    token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  } catch {
    token = null;
  }

  const isApiAuth = pathname.startsWith("/api/auth");
  // Markdown content negotiation is public — same content as the public page.
  const isMarkdownApi = pathname === "/api/md";
  // NOTE: /api/projects is deliberately NOT public: anonymous enumeration of
  // every project (including drafts) is a data leak. The dashboard uses this
  // route with a next-auth admin session, so it now falls through to the
  // admin gate below like every other sensitive endpoint.
  const isChat = pathname.startsWith("/api/chat");
  const isContact = pathname.startsWith("/api/contact");
  // Newsletter double opt-in is public: subscribe/confirm/unsubscribe links
  // are opened by visitors who have no admin session.
  const isNewsletter = pathname.startsWith("/api/newsletter");
  const isSiteConfigGet = pathname.startsWith("/api/site-config") && request.method === "GET";
  // Cal.com signs these with its own HMAC / CRON_SECRET - never with a session.
  const isCalWebhook = pathname === "/api/cal/webhook";
  const isCronReminders = pathname === "/api/cron/reminders";
  const isCronFollowUpReminders = pathname === "/api/cron/follow-up-reminders";
  const isKeepAlive = pathname === "/api/keep-alive";
  // Public liveness probe — no auth, no PII, no-store.
  const isHealth = pathname === "/api/health";
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
  // Tickets are guarded by requireAdmin() (next-auth session) inside the route
  // itself. Basic-auth here would block the dashboard's cookie-only fetch.
  const isTicketsApi = pathname.startsWith("/api/admin/tickets");
  const isNewsletterAdminApi = pathname.startsWith("/api/admin/newsletter");
  const isBookingsAdminApi =
    pathname.startsWith("/api/admin") &&
    !isAgentApi &&
    !isTicketsApi &&
    !isNewsletterAdminApi;
  if (isBookingsAdmin || isBookingsAdminApi) {
    return withBasicAuth(request);
  }

  if (
    isApiAuth ||
    isMarkdownApi ||
    isChat ||
    isContact ||
    isNewsletter ||
    isSiteConfigGet ||
    isCalWebhook ||
    isCronReminders ||
    isCronFollowUpReminders ||
    isKeepAlive ||
    isHealth ||
    isCalSlots ||
    isCalBook
  ) {
    return NextResponse.next();
  }

  const isApi = pathname.startsWith("/api/");

  // Match dashboard routes: exact prefix, prefix/sub, legacy /dashboard or
  // /deuvix (the pre-rename admin path).
  const legacyDashboardPrefix = ["/dashboard", "/deuvix"].find(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  );
  const isDashboard =
    pathname === DASHBOARD_PREFIX ||
    pathname.startsWith(DASHBOARD_PREFIX + "/") ||
    legacyDashboardPrefix !== undefined;
  const isLegacyDashboard = legacyDashboardPrefix !== undefined;

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
      // Diagnostic: which account did Google/GitHub actually hand us?
      console.log(`[middleware] /deuvix DENIED for email=${String(token.email ?? "<none>")}`);
      const login = new URL("/login", request.url);
      login.searchParams.set("error", "AdminOnly");
      login.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(login);
    }
    // Jab legacy prefix aur current DASHBOARD_PREFIX dono "/deuvix" hon,
    // toh khud ko redirect na karein (infinite loop se bachne ke liye).
    // Sirf alag prefix hone par redirect karein; warna isDashboard block se aage badhein.
    if (legacyDashboardPrefix !== DASHBOARD_PREFIX) {
      return NextResponse.redirect(
        new URL(`${DASHBOARD_PREFIX}${pathname.slice(legacyDashboardPrefix.length)}`, request.url)
      );
    }
  }

  if (isDashboard) {
    if (!token) {
      const login = new URL("/login", request.url);
      login.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(login);
    }
    if (!isAdmin) {
      // Diagnostic: which account did Google/GitHub actually hand us?
      console.log(`[middleware] /deuvix DENIED for email=${String(token.email ?? "<none>")}`);
      const login = new URL("/login", request.url);
      login.searchParams.set("error", "AdminOnly");
      login.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(login);
    }
  }

  // Keep HTML and Markdown responses cacheable separately on CDNs, and tell
  // agents where the cheap Markdown representation lives.
  const response = NextResponse.next();
  response.headers.append("Vary", "Accept");
  const alternate = markdownAlternate(pathname);
  if (alternate) {
    response.headers.set("Link", `<${alternate}>; rel="alternate"; type="text/markdown"`);
  }
  return response;
}

export const config = {
  matcher: [
    "/api/:path*",
    // Static files from /public: reject unsupported methods with 405, not 501.
    "/robots.txt",
    "/llms.txt",
    "/favicon-dark.ico",
    "/file.svg",
    "/globe.svg",
    "/next.svg",
    "/vercel.svg",
    "/window.svg",
    "/images/:path*",
    "/fonts/:path*",
    "/logos/:path*",
    "/uploads/:path*",
    // Public content pages, so Accept: text/markdown can be negotiated.
    "/",
    "/index.md",
    "/products",
    "/products.md",
    "/projects/:path*",
    "/projects.md",
    "/about",
    "/about.md",
    "/contact",
    "/contact.md",
    "/blog/:path*",
    "/blog.md",
    "/admin/:path*",
    "/admin",
    "/dashboard/:path*",
    "/dashboard",
    "/deuvix/:path*",
    "/deuvix",
    "/deuvix/:path*",
    "/deuvix",
  ],
};
