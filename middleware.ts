import { NextRequest, NextResponse } from "next/server";

const canonicalUrl = process.env.NEXT_PUBLIC_SITE_URL;
const canonicalRedirectEnabled =
  process.env.NEXT_PUBLIC_CANONICAL_REDIRECT === "true" || process.env.CANONICAL_REDIRECT === "true";

export function middleware(request: NextRequest) {
  if (!canonicalUrl || !canonicalRedirectEnabled || process.env.NODE_ENV !== "production") {
    return NextResponse.next();
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

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
