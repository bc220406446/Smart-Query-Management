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

  useEffect(() => {
    try {
      const saved = localStorage.getItem("wa-phone-mapping");
      if (saved) setMapping(JSON.parse(saved));
    } catch {}
  }, []);

  const saveMapping = (next: Record<string, string>) => {
    setMapping(next);
    try {
      localStorage.setItem("wa-phone-mapping", JSON.stringify(next));
    } catch {}
  };

  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const res = await fetch("/api/whatsapp/log");
        if (res.ok) {
          const j = await res.json();
          setLogs(
            (j as {
              logs?: Array<{
                id: string;
                from: string;
                body: string;
                createdAt: string;
              }>;
            }).logs ?? []
          );
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
    <main className="container-page" style={{ maxWidth: 960 }}>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">WhatsApp Console</h1>
          <p className="page-subtitle">
            FR-02/FR-08 — wire the Baileys listener, map phones to users, and
            reply from here.
          </p>
        </div>
      </div>

      {/* Status bar */}
      <div
        className="card"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "14px 18px",
          marginBottom: 20,
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--text-secondary)",
          }}
        >
          Status
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 10px",
            borderRadius: "var(--radius-full)",
            fontSize: 11,
            fontWeight: 600,
            border: "1px solid",
            background: connected
              ? "var(--success-bg)"
              : "var(--warning-bg)",
            color: connected ? "var(--success)" : "var(--warning)",
            borderColor: connected
              ? "var(--success-border)"
              : "var(--warning-border)",
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: connected ? "var(--success)" : "var(--warning)",
            }}
          />
          {connected ? "Connected" : "Disconnected"}
        </span>
        <button
          onClick={connected ? handleDisconnect : handleConnect}
          className="btn btn-primary"
          style={{ marginLeft: "auto" }}
        >
          {connected ? "Disconnect" : "Connect"}
        </button>
      </div>
      {status && (
        <p
          style={{
            fontSize: 12,
            color: "var(--text-secondary)",
            marginBottom: 20,
          }}
        >
          {status}
        </p>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 20,
          marginBottom: 20,
        }}
      >
        {/* Phone → user mapping */}
        <section className="card">
          <div className="card-header">
            <span className="card-title">Phone → User</span>
          </div>
          <p
            style={{
              fontSize: 12,
              color: "var(--text-secondary)",
              lineHeight: 1.5,
              marginBottom: 14,
            }}
          >
            Map WhatsApp phone numbers to user accounts so incoming messages
            are attached to the right student.
          </p>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {users.map((u) => (
              <label
                key={u.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <input
                  type="tel"
                  placeholder="+923001234567"
                  value={mapping[u.id] ?? ""}
                  onChange={(e) =>
                    saveMapping({
                      ...mapping,
                      [u.id]: e.target.value.trim(),
                    })
                  }
                  className="field-input"
                  style={{ flex: 1 }}
                  aria-label={`Phone for ${u.name}`}
                />
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--text-secondary)",
                  }}
                >
                  {u.name}
                </span>
              </label>
            ))}
          </div>
        </section>

        {/* Manual send */}
        <form
          onSubmit={handleSend}
          className="card"
          style={{ padding: "20px 20px 18px" }}
        >
          <div className="card-header">
            <span className="card-title">Send a reply</span>
          </div>
          <p
            style={{
              fontSize: 12,
              color: "var(--text-secondary)",
              lineHeight: 1.5,
              marginBottom: 12,
            }}
          >
            Send a WhatsApp message from the connected account.
          </p>
          {sendError && (
            <div
              className="error-box"
              style={{ marginBottom: 10 }}
            >
              {sendError}
            </div>
          )}
          <div className="field" style={{ marginBottom: 10 }}>
            <input
              type="text"
              value={sendTo}
              onChange={(e) => setSendTo(e.target.value)}
              placeholder="+923001234567"
              className="field-input"
              aria-label="Recipient phone"
            />
          </div>
          <div className="field" style={{ marginBottom: 14 }}>
            <textarea
              value={sendBody}
              onChange={(e) => setSendBody(e.target.value)}
              placeholder="Reply text…"
              rows={3}
              className="field-textarea"
              aria-label="Message body"
            />
          </div>
          <button type="submit" className="btn btn-primary w-full">
            Send via WhatsApp
          </button>
        </form>
      </div>

      {/* Incoming messages log */}
      <section className="card">
        <div className="card-header">
          <span className="card-title">Incoming messages</span>
          <span
            style={{
              fontSize: 11,
              color: "var(--text-tertiary)",
            }}
          >
            Polls /api/whatsapp/log every 4s
          </span>
        </div>
        <div
          style={{
            maxHeight: 320,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            padding: "4px 2px",
          }}
        >
          {logs.length === 0 ? (
            <p
              style={{
                textAlign: "center",
                color: "var(--text-tertiary)",
                fontSize: 12,
                padding: "24px 0",
              }}
            >
              No messages yet.
            </p>
          ) : (
            logs.map((l) => (
              <div
                key={l.id}
                className="msg-bubble incoming"
                style={{
                  padding: "10px 14px",
                  borderRadius: "var(--radius-md)",
                  borderBottomLeftRadius: 4,
                  border: "1px solid var(--border-light)",
                  background: "var(--bg-elevated)",
                  maxWidth: "85%",
                  alignSelf: "flex-start",
                }}
              >
                <p
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    marginBottom: 4,
                  }}
                >
                  {l.from}
                </p>
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--text-secondary)",
                    lineHeight: 1.5,
                    margin: 0,
                    wordWrap: "break-word",
                  }}
                >
                  {l.body}
                </p>
                <p
                  style={{
                    fontSize: 10,
                    color: "var(--text-tertiary)",
                    marginTop: 4,
                    textAlign: "right",
                  }}
                >
                  {new Date(l.createdAt).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
