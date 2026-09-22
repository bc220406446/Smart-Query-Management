import { NextResponse } from "next/server";
import { connectWhatsApp, isUserTextMessage, normalizeWhatsAppPhone, setWhatsAppMaker } from "@/lib/whatsapp";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { splitIncomingQuery } from "@/lib/query-submission";

export const dynamic = "force-dynamic";
let initialized = false;

async function initializeWhatsApp() {
  if (initialized) return;
  const { Client, LocalAuth } = await import("whatsapp-web.js");
  const qr = await import("qrcode-terminal");
  const qrTerminal = qr.default ?? qr;
  setWhatsAppMaker(() => {
    let ready = false;
    const client = new Client({
      authStrategy: new LocalAuth({ dataPath: process.env.WA_SESSION_PATH ?? "./.wa-auth" }),
      puppeteer: {
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      },
    });
    client.on("qr", (code: string) => { console.log("Scan this WhatsApp QR code:"); qrTerminal.generate(code, { small: true }); });
    client.on("ready", () => { ready = true; console.info("WhatsApp support account is ready."); });
    client.on("message", async (message: { from: string; body: string; fromMe: boolean; isGroupMsg: boolean; getContact?: () => Promise<{ number?: string; id?: { _serialized?: string; user?: string } }> }) => {
      // WhatsApp may deliver a privacy-preserving LID such as 12345@lid.
      // Resolve it through the contact record before matching User.phone.
      let sender = message.from;
      try {
        const contact = await message.getContact?.() ?? await client.getContactById(message.from);
        console.info("WhatsApp contact resolution", {
          incoming: message.from,
          number: contact?.number,
          id: contact?.id?._serialized ?? contact?.id?.user,
        });
        // For LID chats, contact.number can still be the LID. The real
        // WhatsApp phone is available in the serialized contact id.
        const contactPhone = contact?.id?._serialized?.split("@")[0] || contact?.number;
        if (contactPhone) sender = contactPhone;
      } catch { /* keep the original sender id */ }
      const normalized = isUserTextMessage({ ...message, from: sender });
      if (!normalized || normalized.fromMe) return;
      const phone = normalizeWhatsAppPhone(normalized.from);
      if (!phone) return;
      const students = await prisma.user.findMany({
        where: { role: "STUDENT", phone: { not: null } },
        select: { id: true, phone: true },
      });
      const student = students.find((candidate) => normalizeWhatsAppPhone(candidate.phone) === phone);
      if (!student) {
        console.info("Ignoring WhatsApp message from unregistered number", { from: normalized.from, phone });
        return;
      }
      const submission = splitIncomingQuery(undefined, normalized.body);
      const query = await prisma.query.create({ data: { subject: submission.subject, message: submission.message, channel: "WHATSAPP", status: "SUBMITTED", studentId: student.id } });
      await recordAudit({ actorId: null, action: "query_submitted", entityType: "query", entityId: query.id, metadata: { channel: "WHATSAPP", from: normalized.from } });
      console.info("Created WhatsApp query %s from %s; matched student %s (stored phone %s)", query.id, normalized.from, student.id, student.phone);
    });
    return {
      connect: async () => { await client.initialize(); },
      sendMessage: async (to: string, content: unknown) => { await client.sendMessage(`${to.replace(/\D/g, "")}@c.us`, String((content as { text?: string }).text ?? content)); },
      logout: async () => { await client.destroy(); ready = false; },
      ev: { isConnected: () => ready },
    };
  });
  initialized = true;
}

export async function POST() {
  try { await initializeWhatsApp(); void connectWhatsApp().catch((error) => console.error("WhatsApp connect error:", error)); return NextResponse.json({ ok: true, status: "pairing_started" }, { status: 202 }); }
  catch (error) { console.error("Could not initialize WhatsApp:", error); return NextResponse.json({ error: "WhatsApp unavailable" }, { status: 503 }); }
}

export async function GET() { return NextResponse.json({ status: "ready" }); }
