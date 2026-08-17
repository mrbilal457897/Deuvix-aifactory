import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { isAdminEmail } from "@/lib/admin-emails";

const DASHBOARD_PREFIX = process.env.DASHBOARD_PREFIX || "/deux";

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

  if (isApiAuth || isPublicApi || isFetchOg || isChat || isContact || isSiteConfigGet || isProxyImage) {
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
    "/dashboard/:path*",
    "/dashboard",
    "/deux/:path*",
    "/deux",
  ],
};
