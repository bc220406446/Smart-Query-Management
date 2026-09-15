import React from "react";
import Link from "next/link";
import BrandMark from "@/components/BrandMark";
import ThemeToggle from "@/components/ThemeToggle";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  bare?: boolean;
}

export default function AuthLayout({
  title,
  subtitle,
  children,
  bare = false,
}: AuthLayoutProps) {
  return (
    <div className="auth-shell">
      <div className="auth-container">
        <div className="auth-topbar"><Link href="/" className="auth-brand"><BrandMark size={42} /><span>Smart Query Hub</span></Link><ThemeToggle /></div>

        <div
          data-auth-card={!bare}
          className={`auth-card animate-fade-slide${bare ? " auth-card-bare" : ""}`}
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-light)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-md)",
            padding: "32px 28px",
          }}
        >
          {!bare && <><p className="auth-kicker">SMART QUERY HUB</p><h1 className="auth-card-title">
            {title}
          </h1>
          <p className="auth-card-subtitle">
            {subtitle}
          </p></>}

          {children}

        </div>

        <p className="auth-security-note">Secure access for your university workspace.</p>
      </div>
    </div>
  );
}
