import { NextResponse } from "next/server";
import { connectWhatsApp, setBaileysMaker } from "@/lib/whatsapp";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { isUserTextMessage } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

// Lazy-init the Baileys maker on first connect so that `npm run dev` works even
// when @whiskeysockets/baileys is installed but not otherwise imported.
function makeBaileys(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Baileys = require("@whiskeysockets/baileys");
    const makeWASocket = Baileys.default ?? Baileys.makeWASocket;
    if (!makeWASocket || !Baileys.useMultiFileAuthState) throw new Error("Baileys socket factory missing");
    setBaileysMaker(async () => {
      const { state, saveCreds } = await Baileys.useMultiFileAuthState(process.env.WA_SESSION_PATH ?? "./.wa-auth");
      const socket = makeWASocket({ auth: state, printQRInTerminal: true, browser: ["Smart Query Hub", "Chrome", "1.0.0"] });
      socket.ev.on("creds.update", saveCreds);
      socket.ev.on("messages.upsert", async ({ messages, type }: { messages: unknown[]; type: string }) => {
        if (type !== "notify") return;
        for (const message of messages) {
          const normalized = isUserTextMessage(message as Parameters<typeof isUserTextMessage>[0]);
          if (!normalized || normalized.fromMe) continue;
          const phone = normalized.from.replace(/\D/g, "");
          const student = await prisma.user.findFirst({ where: { phone: { in: [normalized.from, `+${phone}`, phone] }, role: "STUDENT" }, select: { id: true } });
          const query = await prisma.query.create({ data: { subject: normalized.body.slice(0, 140) || "WhatsApp message", message: normalized.body, channel: "WHATSAPP", status: "SUBMITTED", studentId: student?.id ?? null } });
          await recordAudit({ actorId: null, action: "query_submitted", entityType: "query", entityId: query.id, metadata: { channel: "WHATSAPP", from: normalized.from } });
          console.info("Created WhatsApp query %s from %s", query.id, normalized.from);
        }
      });
      return {
        connect: async () => new Promise<void>((resolve, reject) => {
          const listener = ({ connection, lastDisconnect }: { connection?: string; lastDisconnect?: { error?: Error } }) => {
            if (connection === "open") { socket.ev.off("connection.update", listener); resolve(); }
            if (connection === "close") { socket.ev.off("connection.update", listener); reject(lastDisconnect?.error ?? new Error("WhatsApp connection closed")); }
          };
          socket.ev.on("connection.update", listener);
        }),
        sendMessage: async (to: string, content: unknown) => { await socket.sendMessage(`${to.replace(/\D/g, "")}@s.whatsapp.net`, content); },
        logout: async () => { await socket.logout(); },
        ev: { isConnected: () => Boolean(socket.user) },
      };
    });
    return true;
  } catch {
    console.error("Could not initialize Baileys");
    return false;
  }
}

export async function POST() {
  if (!makeBaileys()) {
    return NextResponse.json({ error: "Baileys unavailable - install @whiskeysockets/baileys" }, { status: 503 });
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
