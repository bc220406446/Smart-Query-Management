import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json();
    const normalizedEmail = String(email ?? "").trim().toLowerCase();
    if (!String(name ?? "").trim() || !normalizedEmail || !password) return NextResponse.json({ error: "Name, email, and password are required." }, { status: 400 });
    if (String(password).length < 8) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail }, select: { id: true, passwordHash: true } });
    if (existing?.passwordHash) return NextResponse.json({ error: "An account with this email already exists. Sign in instead." }, { status: 409 });
    const passwordHash = await hashPassword(password);
    const user = existing
      ? await prisma.user.update({ where: { id: existing.id }, data: { name: String(name).trim(), passwordHash }, select: { id: true } })
      : await prisma.user.create({ data: { name: String(name).trim(), email: normalizedEmail, passwordHash }, select: { id: true } });
    return NextResponse.json({ ok: true, userId: user.id });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Could not create your account." }, { status: 500 });
  }
}
