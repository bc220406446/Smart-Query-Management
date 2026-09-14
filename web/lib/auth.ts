import NextAuth from "next-auth";
import type { Session } from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifyOtp } from "@/lib/otp";
import { verifyPassword } from "@/lib/password";

// ---------------------------------------------------------------------------
// Auth.js v5 (beta) configuration.
//
// - Google OAuth2 provider (FR-01).
// - Email + OTP credentials provider (POST /api/auth/login with { email, otp }).
//   OTP is verified via lib/otp (stored in the DB verification_tokens table
//   reused by the Prisma adapter).
// - Role lives on the DB user record and is mirrored into the JWT at sign-in.
// ---------------------------------------------------------------------------

function roleForEmail(email: string): Role {
  // Promote known institutional addresses; everyone else is a student.
  if (email.endsWith("vu.edu.pk")) {
    if (email.startsWith("admin@")) return Role.ADMIN;
    if (email.startsWith("hod.")) return Role.HOD;
    if (email.startsWith("s.") || email.startsWith("m.") || email.startsWith("n.")) return Role.INSTRUCTOR;
  }
  return Role.STUDENT;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Google,
    GitHub,
    Credentials({
      name: "email-password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        otp: { label: "OTP", type: "text" },
      },
      async authorize(credentials) {
        const email = (credentials?.email as string | undefined)?.trim().toLowerCase();
        const password = credentials?.password as string | undefined;
        const otp = (credentials?.otp as string | undefined)?.trim();
        if (!email || (!password && !otp)) return null;

        let dbUser = await prisma.user.findUnique({
          where: { email },
          select: { id: true, email: true, name: true, role: true, passwordHash: true },
        });

        if (password) {
          if (!dbUser?.passwordHash || !(await verifyPassword(password, dbUser.passwordHash))) return null;
          return { id: dbUser.id, email: dbUser.email, name: dbUser.name ?? undefined, role: dbUser.role };
        }

        const valid = await verifyOtp(email, otp!);
        if (!valid) return null;

        // OTP verified - sign in / up the user.
        if (!dbUser) {
          dbUser = await prisma.user.create({
            data: { email, name: email.split("@")[0], role: roleForEmail(email) },
            select: { id: true, email: true, name: true, role: true, passwordHash: true },
          });
        }
        if (!dbUser) return null;
        return {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name ?? undefined,
          role: dbUser.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.email) {
        let dbUser = await prisma.user.findUnique({
          where: { email: user.email },
          select: { id: true, role: true },
        });
        if (!dbUser) {
          dbUser = await prisma.user.create({
            data: { email: user.email, name: user.name ?? null, image: user.image ?? null },
            select: { id: true, role: true },
          });
        }
        token.sub = dbUser.id;
        token.role = dbUser.role;
      }
      if (user?.role) {
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = (token.role as Role) ?? Role.STUDENT;
      }
      return session;
    },
    async authorized({ auth: session, request }) {
      const { pathname } = request.nextUrl;
      const role = session?.user?.role;

      if (pathname.startsWith("/api/auth")|| pathname === "/login" || pathname === "/register") {
        return true;
      }
      if (pathname.startsWith("/staff")) {
        return role === Role.INSTRUCTOR || role === Role.HOD || role === Role.ADMIN;
      }
      if (pathname.startsWith("/hod")) {
        return role === Role.HOD || role === Role.ADMIN;
      }
      if (pathname.startsWith("/admin")) {
        return role === Role.ADMIN;
      }
      if (pathname.startsWith("/dashboard")) {
        return !!role;
      }
      return true;
    },
  },
});

export const getSession = auth as unknown as () => Promise<Session | null>;
