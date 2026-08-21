import { NextRequest, NextResponse } from "next/server";

// Optimistic UX guard only — the real authorization boundary is requireMxUser()
// in server components and actions (see docs/PRIVACY_SECURITY.md).
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/signup");
  // Machine endpoints authenticate themselves (MAINXP_JOBS_SECRET / vercel-cron
  // UA) — they carry no session cookie by nature, and redirecting them to
  // /login would silently turn every scheduled tick into a no-op.
  if (pathname.startsWith("/api/cron/") || pathname.startsWith("/api/jobs/")) {
    return NextResponse.next();
  }
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
  // Everything except Next internals and public files. The installability
  // assets (manifest, icons) and the service worker MUST stay reachable while
  // logged out: a redirected /sw.js aborts registration, and a redirected
  // manifest breaks "Sur l'écran d'accueil" — the only door to notifications
  // on iOS.
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sw\\.js|manifest\\.webmanifest|.*\\.(?:png|jpg|jpeg|webp|svg|ico|txt)$).*)",
  ],
};
