"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface UserEntry {
  id: string;
  name: string;
  email: string;
}

interface LogEntry {
  id: string;
  from: string;
  body: string;
  createdAt: string;
}

export default function WhatsAppConsole({ users }: { users: UserEntry[] }) {
  void useRouter();
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState("");
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [sendTo, setSendTo] = useState("");
  const [sendBody, setSendBody] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [sendError, setSendError] = useState("");

  // Load the current phone→user mapping from localStorage (demo convenience).
  useEffect(() => {
    try {
      const saved = localStorage.getItem("wa-phone-mapping");
      if (saved) setMapping(JSON.parse(saved));
    } catch {}
  }, []);

  const saveMapping = (next: Record<string, string>) => {
    setMapping(next);
    try { localStorage.setItem("wa-phone-mapping", JSON.stringify(next)); } catch {}
  };

  useEffect(() => {
    // In production, the Baileys listener process POSTs incoming messages to
    // /api/whatsapp/ingest and writes a log entry. Here we poll the same
    // endpoint to simulate a live feed for the console demo.
    const timer = setInterval(async () => {
    try {
      const res = await fetch("/api/whatsapp/log");
      if (res.ok) {
        const j = await res.json();
        setLogs((j as { logs?: Array<{ id: string; from: string; body: string; createdAt: string }> }).logs ?? []);
      }
    } catch {}
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const handleConnect = async () => {
    setStatus("Connecting…");
    try {
      const res = await fetch("/api/whatsapp/connect", { method: "POST" });
      if (!res.ok) throw new Error("Connection failed");
      setConnected(true);
      setStatus("Connected");
    } catch {
      setStatus("Connection failed");
      setConnected(false);
    }
  };

  const handleDisconnect = async () => {
    setStatus("Disconnecting…");
    try {
      await fetch("/api/whatsapp/disconnect", { method: "POST" });
      setConnected(false);
      setStatus("Disconnected");
    } catch {
      setStatus("Disconnect failed");
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendError("");
    if (!sendTo || !sendBody.trim()) return;
    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: sendTo, body: sendBody.trim() }),
      });
      if (!res.ok) throw new Error("Send failed");
      setSendBody("");
      setStatus("Message sent");
    } catch {
      setSendError("Send failed");
    }
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="neu p-6 animate-in">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">WhatsApp Console</h1>
        <p className="mt-1 caption">FR-02/FR-08 — wire the Baileys listener, map phones to users, and reply from here.</p>

        <div className="mt-5 flex items-center gap-3">
          <span className="text-sm font-medium text-[var(--foreground)]">Status</span>
          {connected ? (
            <span className="chip chip-success">Connected</span>
          ) : (
            <span className="chip chip-warning">Disconnected</span>
          )}
          <button
            onClick={connected ? handleDisconnect : handleConnect}
            className="neu-btn ml-auto"
          >
            {connected ? "Disconnect" : "Connect"}
          </button>
        </div>
        {status && <p className="mt-2 caption">{status}</p>}

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* Phone → user mapping */}
          <section className="neu-sm p-5">
            <h2 className="text-sm font-semibold text-[var(--foreground)]">Phone → User</h2>
            <p className="mt-1 caption">Map WhatsApp phone numbers to user accounts so incoming messages are attached to the right student.</p>
            <div className="mt-3 space-y-2">
              {users.map((u) => (
                <label key={u.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="tel"
                    placeholder="+923001234567"
                    value={mapping[u.id] ?? ""}
                    onChange={(e) =>
                      saveMapping({ ...mapping, [u.id]: e.target.value.trim() })
                    }
                    className="neu-input flex-1"
                    aria-label={`Phone for ${u.name}`}
                  />
                  <span className="caption">{u.name}</span>
                </label>
              ))}
            </div>
          </section>

          {/* Manual send */}
          <form onSubmit={handleSend} className="neu-sm p-5">
            <h2 className="text-sm font-semibold text-[var(--foreground)]">Send a reply</h2>
            <p className="mt-1 caption">Send a WhatsApp message from the connected account.</p>
            {sendError && <p className="mt-2 text-sm text-[var(--danger)]">{sendError}</p>}
            <input
              type="text"
              value={sendTo}
              onChange={(e) => setSendTo(e.target.value)}
              placeholder="+923001234567"
              className="neu-input mt-2 w-full"
              aria-label="Recipient phone"
            />
            <textarea
              value={sendBody}
              onChange={(e) => setSendBody(e.target.value)}
              placeholder="Reply text…"
              rows={3}
              className="neu-input mt-2 w-full"
              aria-label="Message body"
            />
            <button type="submit" className="neu-btn neu-btn-accent mt-3 w-full">
              Send via WhatsApp
            </button>
          </form>
        </div>

        {/* Live incoming log */}
        <section className="mt-6 neu-sm p-5">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">Incoming messages</h2>
          <p className="mt-1 caption">Polls /api/whatsapp/log for a live feed of incoming WhatsApp messages.</p>
          <div className="mt-3 max-h-64 overflow-y-auto space-y-2">
            {logs.length === 0 ? (
              <p className="caption">No messages yet.</p>
            ) : (
              logs.map((l) => (
                <div key={l.id} className="rounded-lg neu-xs p-3">
                  <p className="truncate text-sm font-medium text-[var(--foreground)]">{l.from}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--foreground-soft)]">{l.body}</p>
                  <p className="mt-1 caption">{new Date(l.createdAt).toLocaleString()}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
