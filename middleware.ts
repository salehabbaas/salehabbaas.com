import { NextRequest, NextResponse } from "next/server";

const canonicalUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://salehabbaas.com";
const canonicalRedirectPreference = process.env.CANONICAL_REDIRECT ?? process.env.NEXT_PUBLIC_CANONICAL_REDIRECT;
const canonicalRedirectEnabled = canonicalRedirectPreference ? canonicalRedirectPreference !== "false" : true;

function shouldNoIndex(pathname: string) {
  return (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/preview") ||
    pathname.startsWith("/auth/callback") ||
    pathname.startsWith("/api/auth")
  );
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const nextResponse = NextResponse.next();

  if (shouldNoIndex(pathname)) {
    nextResponse.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  }

  if (!canonicalUrl || !canonicalRedirectEnabled || process.env.NODE_ENV !== "production") {
    return nextResponse;
  }

  const target = new URL(canonicalUrl);
  const host = request.headers.get("host") || "";
  const proto = request.headers.get("x-forwarded-proto") || "https";

  const shouldRedirectHost = host && host !== target.host;
  const shouldRedirectProto = proto !== "https";

  if (shouldRedirectHost || shouldRedirectProto) {
    const redirectUrl = new URL(request.nextUrl.pathname + request.nextUrl.search, canonicalUrl);
    return NextResponse.redirect(redirectUrl, 308);
  }

  return nextResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
