import { NextResponse } from "next/server";
import { z } from "zod";
import { sendWhatsAppReply, whatsappEnabled } from "@/lib/whatsapp";

const sendSchema = z.object({
  to: z.string().min(1, "Recipient phone is required"),
  body: z.string().min(1, "Message body is required"),
});

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!whatsappEnabled) return NextResponse.json({ error: "WhatsApp is disabled in this deployment" }, { status: 503 });
  try {
    const parsed = sendSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    await sendWhatsAppReply(parsed.data.to, parsed.data.body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("WhatsApp send error:", err);
    return NextResponse.json({ error: "Send failed" }, { status: 500 });
  }
}
