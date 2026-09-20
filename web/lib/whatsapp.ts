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

type WhatsAppState = {
  maker: WhatsAppMaker | null;
  inst: WhatsAppInst | null;
  ready: Promise<void> | null;
};

const globalState = globalThis as typeof globalThis & { __smartQueryWhatsApp?: WhatsAppState };
const state: WhatsAppState = globalState.__smartQueryWhatsApp ?? {
  maker: null,
  inst: null,
  ready: null,
};
globalState.__smartQueryWhatsApp = state;

/** Register a minimal outgoing client when the connect route was not visited. */
async function ensureWhatsAppMaker() {
  if (state.maker) return;
  const { Client, LocalAuth } = await import("whatsapp-web.js");
  setWhatsAppMaker(() => {
    let ready = false;
    const client = new Client({
      authStrategy: new LocalAuth({ dataPath: process.env.WA_SESSION_PATH ?? "./.wwebjs-auth" }),
      puppeteer: {
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      },
    });
    client.on("ready", () => { ready = true; console.info("WhatsApp support account is ready for notifications."); });
    return {
      connect: async () => { await client.initialize(); },
      sendMessage: async (to: string, content: unknown) => {
        await client.sendMessage(`${to.replace(/\D/g, "")}@c.us`, String((content as { text?: string }).text ?? content));
      },
      logout: async () => { await client.destroy(); ready = false; },
      ev: { isConnected: () => ready },
    };
  });
}

/**
 * Configure the WhatsApp client maker once at server startup.
 */
export function setWhatsAppMaker(maker: WhatsAppMaker) {
  state.maker = maker;
}

/** Connect (or reconnect) the WhatsApp socket. Returns once connected. */
export async function connectWhatsApp(pushName = "SmartQueryHub") {
  if (!state.maker) throw new Error("WhatsApp maker not configured - call setWhatsAppMaker first.");
  if (state.inst && state.ready) return state.ready;

  const inst = await state.maker();
  state.inst = inst;

  state.ready = (async () => {
    await inst.connect();
    // Mark the profile name in WhatsApp contacts so outgoing messages look branded.
    if ("updateProfileName" in inst) {
      try { (inst as WhatsAppInst & { updateProfileName?: (name: string) => Promise<void> }).updateProfileName?.(pushName); } catch { /* ignore */ }
    }
  })();

  return state.ready;
}

/** Disconnect and clear state. */
export async function disconnectWhatsApp() {
  if (state.inst) {
    try { await state.inst.logout(); } catch { /* ignore */ }
    state.inst = null;
  }
  state.ready = null;
}

/** Current WhatsApp instance, connecting first if needed. */
export async function getInst(): Promise<WhatsAppInst> {
  if (!state.inst || !state.ready) await connectWhatsApp();
  await state.ready;
  if (!state.inst) throw new Error("WhatsApp not connected");
  return state.inst;
}

/** Send a text reply to a phone number (E.164, e.g. "+923001234567"). */
export async function sendWhatsAppReply(to: string, text: string) {
  await ensureWhatsAppMaker();
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
