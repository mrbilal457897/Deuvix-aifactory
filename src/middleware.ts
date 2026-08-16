import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { isAdminEmail } from "@/lib/admin-emails";

export async function middleware(request: NextRequest) {
  let token: Awaited<ReturnType<typeof getToken>> | null = null;
  try {
    token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  } catch {
    // Missing/invalid NEXTAUTH_SECRET (e.g. unconfigured deploy): treat as signed out.
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
  const isDeux = pathname.startsWith("/deux");
  const isLegacyDashboard = pathname.startsWith("/dashboard");

  // Authorize by the email allowlist, not the session role claim, so older
  // tokens that carry a stale role never lock an allowed owner out.
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
    return NextResponse.redirect(new URL(`/deux${pathname.slice("/dashboard".length)}`, request.url));
  }

  if (isDeux) {
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
  matcher: ["/api/:path*", "/deux/:path*", "/deux", "/dashboard/:path*", "/dashboard"],
};
