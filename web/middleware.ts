export { auth as middleware } from "@/lib/auth";

// Protect everything except static assets and the auth API routes.
export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|ico)$).*)"],
};