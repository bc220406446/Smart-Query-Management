import { NextResponse } from "next/server";
import { verifyOtp } from "@/lib/otp";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

// OTP login endpoint (FR-01 email+OTP).
// Verifies the OTP server-side and, on success, signs the user in via the
// NextAuth signIn() client helper path. We return a short-lived session token
// the client can exchange, OR instruct the client to call /api/auth/callback.
export const dynamic = "force-dynamic";

function roleForEmail(email: string): Role {
  if (email.endsWith("vu.edu.pk")) {
    if (email.startsWith("admin@")) return Role.ADMIN;
    if (email.startsWith("hod.")) return Role.HOD;
    if (email.startsWith("s.") || email.startsWith("m.") || email.startsWith("n.")) return Role.INSTRUCTOR;
  }
  return Role.STUDENT;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, otp } = body as { email?: string; otp?: string };

    if (!email || !otp) {
      return NextResponse.json({ error: "Email and OTP are required." }, { status: 400 });
    }

    const ok = await verifyOtp(email, otp);
    if (!ok) {
      return NextResponse.json({ error: "Invalid or expired code." }, { status: 401 });
    }

    // OTP verified — ensure a DB user exists and return their id so the client
    // can complete sign-in through the NextAuth credentials provider.
    let dbUser = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: { id: true, role: true },
    });
    if (!dbUser) {
      dbUser = await prisma.user.create({
        data: { email: email.trim().toLowerCase(), name: email.split("@")[0], role: roleForEmail(email) },
        select: { id: true, role: true },
      });
    }

    return NextResponse.json({
      ok: true,
      userId: dbUser.id,
      role: dbUser.role,
      redirect: "/dashboard",
    });
  } catch (err) {
    console.error("OTP login error:", err);
    return NextResponse.json({ error: "Login failed. Please try again." }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    providers: ["google", "email-otp"],
    info: "POST JSON { email, otp } to sign in via email+OTP.",
  });
}
