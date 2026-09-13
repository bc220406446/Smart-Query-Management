import { NextResponse } from "next/server";

// Keep middleware Edge-safe. Auth.js imports Prisma through lib/auth, and the
// Prisma PostgreSQL adapter is Node-only. Protected pages/API routes perform
// their session checks in the server runtime instead.
export function middleware() {
  return NextResponse.next();
}

// Protect everything except static assets and the auth API routes.
export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|ico)$).*)"],
};
