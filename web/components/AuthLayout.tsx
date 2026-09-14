import React from "react";
import Link from "next/link";
import BrandMark from "@/components/BrandMark";
import ThemeToggle from "@/components/ThemeToggle";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export default function AuthLayout({
  title,
  subtitle,
  children,
}: AuthLayoutProps) {
  return (
    <div className="auth-shell">
      <div className="auth-container">
        <div className="auth-topbar"><Link href="/" className="auth-brand"><BrandMark size={42} /><span>Smart Query Hub</span></Link><ThemeToggle /></div>

        <div
          className="animate-fade-slide"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-light)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-md)",
            padding: "32px 28px",
          }}
        >
          <h1 style={{ fontSize: 22, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4, letterSpacing: "-0.01em" }}>
            {title}
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 20, lineHeight: 1.5 }}>
            {subtitle}
          </p>

          {children}

        </div>

        <p className="auth-security-note">Secure access for your university workspace.</p>
      </div>
    </div>
  );
}
