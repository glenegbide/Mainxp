import { NextRequest, NextResponse } from "next/server";

// Optimistic UX guard only — the real authorization boundary is requireMxUser()
// in server components and actions (see docs/PRIVACY_SECURITY.md).
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/signup");
  const hasSession = !!req.cookies.get("mxp_session")?.value;

  if (!isAuthPage && !hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  if (isAuthPage && hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/today";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Everything except Next internals and static assets.
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|icon\\.png|robots\\.txt).*)"],
};
