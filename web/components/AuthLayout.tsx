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
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand mark */}
        <div className="flex items-center justify-center gap-2 rounded-xl neu px-4 py-3 mb-6 animate-in">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)] text-xs font-bold text-white">
            SQ
          </span>
          <span className="text-sm font-semibold text-[var(--foreground)]">Smart Query Hub</span>
        </div>

        <div className="auth-card animate-in animate-in-delay-1">
          <h1 className="auth-title">{title}</h1>
          <p className="auth-sub">{subtitle}</p>

          {children}

          <div className="mt-6 flex justify-center">
            <button type="button" className="neu-btn text-sm">
              {actionLabel}
            </button>
          </div>
        </div>

        <p className="mt-6 text-center caption">
          Uses your institutional email and a one-time code.
        </p>
      </div>
    </div>
  );
}
