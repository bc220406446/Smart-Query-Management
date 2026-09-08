import { NextResponse } from "next/server";
import { connectWhatsApp, setBaileysMaker } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

// Lazy-init the Baileys maker on first connect so that `npm run dev` works even
// when @whiskeysockets/baileys is installed but not otherwise imported.
function makeBaileys(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Baileys = require("@whiskeysockets/baileys").default;
    if (!Baileys) throw new Error("Baileys default export missing");
    setBaileysMaker((opts) => new Baileys(opts));
    return true;
  } catch {
    console.error("Could not initialize Baileys");
    return false;
  }
}

export async function POST() {
  if (!makeBaileys()) {
    return NextResponse.json({ error: "Baileys unavailable — install @whiskeysockets/baileys" }, { status: 503 });
  }
  try {
    await connectWhatsApp();
    return NextResponse.json({ ok: true, status: "connected" });
  } catch (err) {
    console.error("WhatsApp connect error:", err);
    return NextResponse.json({ error: "Could not connect" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: "ready" });
}
