import React from "react";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  actionLabel?: string;
}

export default function AuthLayout({
  title,
  subtitle,
  children,
  actionLabel = "Continue",
}: AuthLayoutProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        {/* Brand mark */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            padding: "12px 18px",
            borderRadius: "var(--radius-lg)",
            background: "var(--bg-sunken)",
            border: "1px solid var(--border-light)",
            marginBottom: 24,
          }}
        >
          <span
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              height: 32,
              borderRadius: "8px",
              background: "var(--brand-500)",
              color: "var(--brand-contrast)",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            SQ
          </span>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Smart Query Hub</span>
        </div>

        <div
          className="animate-fade-slide"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-light)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-md)",
            padding: "28px 24px",
          }}
        >
          <h1 style={{ fontSize: 22, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4, letterSpacing: "-0.01em" }}>
            {title}
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 20, lineHeight: 1.5 }}>
            {subtitle}
          </p>

          {children}

          <div style={{ marginTop: 22, display: "flex", justifyContent: "center" }}>
            <button
              type="button"
              className="btn btn-primary"
            >
              {actionLabel}
            </button>
          </div>
        </div>

        <p style={{ marginTop: 22, textAlign: "center", fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
          Uses your institutional email and a one-time code.
        </p>
      </div>
    </div>
  );
}
