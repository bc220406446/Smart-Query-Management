import { NextResponse } from "next/server";

// In-memory ring buffer for the demo console. In production, persist these
// rows to Postgres (e.g. a `whatsapp_events` table) and read them here.
const LOG: Array<{ id: string; from: string; body: string; createdAt: string }> = [];
const MAX = 50;

export const dynamic = "force-dynamic";

function push(entry: { from: string; body: string }) {
  LOG.unshift({ ...entry, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
  if (LOG.length > MAX) LOG.pop();
}

// The Baileys listener calls this when a message arrives (via a server-only hook
// or a small standalone script). For the demo console, we expose a writable
// endpoint so the console can simulate incoming messages by POSTing here.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { from, body: message } = body as { from?: string; body?: string };
    if (!from || !message) return NextResponse.json({ error: "from + body required" }, { status: 400 });
    push({ from, body: message });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Log write failed" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ logs: LOG });
}
