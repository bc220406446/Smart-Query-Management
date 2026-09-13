"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import AuthLayout from "@/components/AuthLayout";
import "@/components/AuthForms.css";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [resendDisabled, setResendDisabled] = useState(false);
  const [resendLabel, setResendLabel] = useState("Code sent — check your inbox");
  const [, startTransition] = useTransition();

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) {
      setError("Enter your email first.");
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not send code.");
        return;
      }
      setMode("otp");
      setOtp(["", "", "", "", "", ""]);
      setResendDisabled(true);
      setResendLabel("Code sent — check your inbox");
      setTimeout(() => {
        setResendDisabled(false);
        setResendLabel("Send a new code");
      }, 60_000);
    });
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);
    if (value && index < 5) {
      const nextField = document.getElementById(`otp-${index + 1}`) as HTMLInputElement;
      nextField?.focus();
    }
  };

  const otpString = otp.join("");

  const LoginButton = () => {
    const { pending } = useFormStatus();
    return (
      <button
        type="submit"
        disabled={pending || otpString.length < 6}
        className="btn btn-primary btn-lg"
      >
        {pending
          ? "Verifying…"
          : otpString.length < 6
          ? "Enter the 6-digit code"
          : "Sign in"}
      </button>
    );
  };

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Enter your institutional email, then verify with the code we send you."
      actionLabel="Sign in with Google"
    >
      <form
        onSubmit={mode === "email" ? handleRequestOtp : (e) => {
          e.preventDefault();
          startTransition(async () => {
            setError("");
            const res = await fetch("/api/auth/login", {
              method: "POST",
              headers: { "Content-Type": "application/json", "x-callback-url": "/dashboard" },
              body: JSON.stringify({ email: email.trim(), otp: otpString }),
            });
            const data = await res.json();
            if (!res.ok) {
              setError(data.error ?? "Invalid code. Try again.");
              return;
            }
            await signIn("credentials", {
              email: email.trim(),
              otp: otpString,
              redirect: false,
              callbackUrl: "/dashboard",
            });
            router.push("/dashboard");
          });
        }}
      >
        {error && <div className="auth-error">{error}</div>}

        {mode === "email" && (
          <>
            <div className="field" style={{ marginBottom: 14 }}>
              <label className="field-label">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@vu.edu.pk"
                required
                className="field-input"
              />
            </div>
            <button type="submit" className="btn btn-primary w-full" style={{ width: "100%" }}>
              Send verification code
            </button>

            <div className="divider-text">or</div>

            <SignInButtonGoogle />
          </>
        )}

        {mode === "otp" && (
          <>
            <p style={{ textAlign: "center", fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
              We sent a 6-digit code to <strong>{email}</strong>
            </p>
            <div className="otp-row" role="group" aria-label="One-time code">
              {otp.map((val, i) => (
                <input
                  key={i}
                  id={`otp-${i}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={val}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  className="otp-chip"
                  aria-label={`Digit ${i + 1}`}
                />
              ))}
            </div>

            <LoginButton />

            <p className="resend-link">
              {resendDisabled ? (
                resendLabel
              ) : (
                <button type="button" onClick={handleRequestOtp}>
                  {resendLabel}
                </button>
              )}
            </p>

            <div className="divider-text">or</div>

            <SignInButtonGoogle />

            <p style={{ textAlign: "center", marginTop: 18, fontSize: 12, color: "var(--text-secondary)" }}>
              <button
                type="button"
                onClick={() => setMode("email")}
                style={{ background: "none", border: "none", color: "var(--brand-500)", fontWeight: 600, cursor: "pointer", textDecoration: "underline", padding: 0, fontSize: "inherit" }}
              >
                Use a different email
              </button>
            </p>
          </>
        )}
      </form>
    </AuthLayout>
  );
}

function SignInButtonGoogle() {
  return (
    <button
      type="button"
      onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
      className="btn btn-secondary w-full"
      style={{ width: "100%", gap: 10 }}
    >
      <svg width={18} height={18} viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 5.04c1.85 0 3.5.64 4.8 1.9l3.58-3.58C18.2 1.35 15.3.25 12 .25 7.4.25 3.4 2.78 1.35 6.53l4.16 3.23C6.35 7.08 8.92 5.04 12 5.04z"
        />
        <path
          fill="currentColor"
          d="M23.49 12.27c0-.85-.08-1.67-.22-2.46H12v4.65h6.45c-.28 1.5-1.12 2.77-2.4 3.62l3.76 2.92c2.2-2.03 3.68-5.02 3.68-8.73z"
          opacity={0.75}
        />
        <path
          fill="currentColor"
          d="M5.52 14.4a7.06 7.06 0 0 1 0-4.6L1.36 6.57A11.92 11.92 0 0 0 .24 12c0 1.94.42 3.78 1.16 5.42l4.12-3.02z"
          opacity={0.85}
        />
        <path
          fill="currentColor"
          d="M12 23.75c3.12 0 5.74-1.03 7.66-2.79l-3.76-2.92c-1.03.7-2.36 1.12-3.9 1.12-3.08 0-5.65-2.04-6.58-4.76l-4.16 3.23C3.4 21.22 7.4 23.75 12 23.75z"
          opacity={0.65}
        />
      </svg>
      Sign in with Google
    </button>
  );
}

