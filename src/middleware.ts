import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
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
  const isDashboard = pathname.startsWith("/dashboard");

  if (isApi) {
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (token.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.next();
  }

  if (isDashboard) {
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (token.role !== "admin") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  if (pathname === "/deux") {
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (token.role !== "admin") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*", "/dashboard/:path*", "/deux"],
};
