import { Role } from "@prisma/client";
import type { Session } from "next-auth";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export type SessionUser = NonNullable<Session["user"]>;

/** Returns the signed-in user, redirecting to "/" if not signed in. */
export async function requireUser(): Promise<SessionUser> {
  const session = await getSession();
  if (!session?.user) redirect("/");
  return session.user;
}

/** Returns the signed-in user only if their role is in `allowed`, else redirects. */
export async function requireRole(allowed: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!allowed.includes(user.role)) redirect("/dashboard");
  return user;
}

export const STAFF_ROLES = [Role.INSTRUCTOR, Role.HOD, Role.ADMIN] as const;