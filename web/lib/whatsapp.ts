/**
 * WhatsApp integration (FR-02 / FR-08) using whatsapp-web.js.
 *
 * Wires a long-running WhatsApp listener into the Next web app so incoming
 * WhatsApp messages are normalized into `queries` rows (channel = WHATSAPP)
 * and the AI pipeline picks them up automatically. Staff can also reply from
 * the staff detail page using the same socket.
 *
 * NOTE: whatsapp-web.js is intended for local/demo use. For production prefer
 * the official WhatsApp Cloud API.
 */

type WhatsAppInst = { connect: () => Promise<void>; sendMessage: (to: string, content: unknown) => Promise<void>; logout: () => Promise<void>; ev?: { isConnected?: () => boolean } };
type WhatsAppMaker = () => WhatsAppInst | Promise<WhatsAppInst>;

let _maker: WhatsAppMaker | null = null;
let _inst: WhatsAppInst | null = null;
let _ready: Promise<void> | null = null;

/**
 * Configure the WhatsApp client maker once at server startup.
 */
export function setWhatsAppMaker(maker: WhatsAppMaker) {
  _maker = maker;
}

/** Connect (or reconnect) the WhatsApp socket. Returns once connected. */
export async function connectWhatsApp(pushName = "SmartQueryHub") {
  if (!_maker) throw new Error("WhatsApp maker not configured - call setWhatsAppMaker first.");
  if (_inst && _inst.ev?.isConnected?.()) return _ready!;

  const inst = await _maker();
  _inst = inst;

  _ready = (async () => {
    await inst.connect();
    // Mark the profile name in WhatsApp contacts so outgoing messages look branded.
    if ("updateProfileName" in inst) {
      try { (inst as WhatsAppInst & { updateProfileName?: (name: string) => Promise<void> }).updateProfileName?.(pushName); } catch { /* ignore */ }
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

/** Current WhatsApp instance, connecting first if needed. */
export async function getInst(): Promise<WhatsAppInst> {
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
export function isUserTextMessage(msg: { from?: string; body?: string; isGroupMsg?: boolean; fromMe?: boolean }) {
  const content = msg.body;
  if (!content || typeof content !== "string") return null;
  const from = msg.from;
  if (msg.isGroupMsg) return null;
  if (!from) return null;
  return { from, body: content.trim(), fromMe: Boolean(msg.fromMe) };
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
