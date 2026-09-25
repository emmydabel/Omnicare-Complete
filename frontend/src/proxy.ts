import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Route protection — UX layer only, not a security boundary.
 *
 * This only checks whether an access-token cookie is *present* and does a
 * redirect; it deliberately does not verify the JWT signature or call the
 * backend (per Next.js 16 guidance, proxy.ts should stay to lightweight
 * edge-network tasks like redirects, not heavy auth logic). The real
 * security boundary is the Django backend's JWT auth + DRF permission
 * classes, which check every request regardless of what this file does. A
 * user who deletes their cookie and forges a request still gets a real 401
 * from Django — this file only prevents a logged-out user from briefly
 * seeing a protected page's shell before client-side code would've bounced
 * them, and vice versa for an already-logged-in user hitting /login.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get("omnicare_access")?.value);

  const isProtectedRoute = pathname.startsWith("/dashboard");
  const isAuthRoute = pathname === "/login" || pathname === "/register";

  if (isProtectedRoute && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthRoute && hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Exported both ways since some Next.js 16.x tooling/examples show a default
// export and some show a named export for this file — this satisfies either.
export default proxy;

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
