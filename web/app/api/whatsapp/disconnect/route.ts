import { NextResponse } from "next/server";
import { disconnectWhatsApp } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await disconnectWhatsApp();
    return NextResponse.json({ ok: true, status: "disconnected" });
  } catch (err) {
    console.error("WhatsApp disconnect error:", err);
    return NextResponse.json({ error: "Disconnect failed" }, { status: 500 });
  }
}
