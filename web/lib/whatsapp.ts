/**
 * WhatsApp integration (FR-02 / FR-08) using @whiskeysockets/baileys.
 *
 * Wires a long-running WhatsApp listener into the Next web app so incoming
 * WhatsApp messages are normalized into `queries` rows (channel = WHATSAPP)
 * and the AI pipeline picks them up automatically. Staff can also reply from
 * the staff detail page using the same socket.
 *
 * NOTE: Baileys is unofficial and can trigger account warnings/suspension on
 * repeated use. For production prefer the official WhatsApp Cloud API; this is
 * acceptable for a FYP/demo environment.
 */

import type { WAMessage } from "@whiskeysockets/baileys";

// Baileys types are exported via the default import; declare the maker shape loosely.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BaileysInst = { connect: () => Promise<void>; sendMessage: (to: string, content: any) => Promise<void>; logout: () => Promise<void>; ev?: { isConnected?: () => boolean } };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BaileysMaker = (opts: any) => BaileysInst | Promise<BaileysInst>;

let _maker: BaileysMaker | null = null;
let _inst: BaileysInst | null = null;
let _ready: Promise<void> | null = null;

/**
 * Configure the Baileys maker. Call once at server startup with the
 * `@whiskeysockets/baileys` default export (or your preferred maker).
 */
export function setBaileysMaker(maker: BaileysMaker) {
  _maker = maker;
}

/** Connect (or reconnect) the WhatsApp socket. Returns once connected. */
export async function connectWhatsApp(pushName = "SmartQueryHub") {
  if (!_maker) throw new Error("Baileys maker not configured - call setBaileysMaker first.");
  if (_inst && _inst.ev?.isConnected?.()) return _ready!;

  const inst = await _maker({
    // Use a session cache so the connection survives restarts.
    // In production, persist `cache.json` to disk and reload it.
    ...(process.env.WA_SESSION_PATH
      ? { sessionCache: { type: "memory", data: {} } }
      : {}),
  });
  _inst = inst;

  _ready = (async () => {
    await inst.connect();
    // Mark the profile name in WhatsApp contacts so outgoing messages look branded.
    if ("updateProfileName" in inst) {
      try { (inst as BaileysInst & { updateProfileName?: (name: string) => Promise<void> }).updateProfileName?.(pushName); } catch { /* ignore */ }
    }
  })();

  return _ready;
}

/** Disconnect and clear state. */
export async function disconnectWhatsApp() {
  if (_inst) {
    try { await _inst.logout(); } catch { /* ignore */ }
    _inst = null;
  }
  _ready = null;
}

/** Current Baileys instance, connecting first if needed. */
export async function getInst(): Promise<BaileysInst> {
  if (!_inst || !_ready) await connectWhatsApp();
  await _ready;
  if (!_inst) throw new Error("WhatsApp not connected");
  return _inst;
}

/** Send a text reply to a phone number (E.164, e.g. "+923001234567"). */
export async function sendWhatsAppReply(to: string, text: string) {
  const inst = await getInst();
  await inst.sendMessage(to, { text, type: "chat" });
}

/** Basic QA: is this message from a personal chat (not group) and text-ish? */
export function isUserTextMessage(msg: WAMessage) {
  const content = msg.message?.conversation ?? msg.message?.extendedTextMessage?.text;
  if (!content || typeof content !== "string") return null;
  const from = msg.key?.remoteJid;
  // Skip group messages (remoteJid ends with @g.us).
  if (from && from.endsWith("@g.us")) return null;
  if (!from) return null;
  return { from, body: content.trim(), fromMe: !!msg.key?.fromMe };
}

/**
 * Create a database query from a normalized WhatsApp message.
 * `studentUserIds` maps a phone (E.164 without + ) → an existing User id so
 * we can attach the query to a known student. When unknown we still create the
 * query; downstream staff can attach it manually.
 */
export interface WhatsAppUserMap {
  [phoneWithoutPlus: string]: string; // userId
}

export async function createQueryFromWhatsApp(
  body: { from: string; body: string },
  studentUserIds: WhatsAppUserMap,
  createQuery: (data: {
    subject: string;
    message: string;
    channel: "WHATSAPP";
    studentId?: string | null;
  }) => Promise<{ id: string; ticketNumber: string }>
) {
  // Phone number from `from` - strip leading "+" if present.
  const phoneRaw = body.from.includes("@") ? body.from : body.from.replace(/^\+/, "");
  // If it is a group, ignore (handled above in isUserTextMessage).
  const studentId = studentUserIds[phoneRaw] ?? null;

  const subject = body.body.slice(0, 120) || "WhatsApp message";
  const message = body.body;

  const query = await createQuery({ subject, message, channel: "WHATSAPP", studentId });
  return query;
}
