"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import AuthLayout from "@/components/AuthLayout";

export default function RegisterPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [resendDisabled, setResendDisabled] = useState(false);
  const [resendLabel, setResendLabel] = useState("Resend code");
  const [, startTransition] = useTransition();

  const requestOtp = async (e: React.FormEvent) => {
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
      setResendLabel("Resend in 60s");
      setTimeout(() => setResendDisabled(false), 60_000);
    });
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);
    if (value && index < 5) {
      const nextField = document.getElementById(`reg-otp-${index + 1}`) as HTMLInputElement;
      nextField?.focus();
    }
  };

  const otpString = otp.join("");

  const RegisterButton = () => {
    const { pending } = useFormStatus();
    return (
      <button
        type="submit"
        disabled={pending || otpString.length < 6}
        className="neu-btn neu-btn-accent w-full mt-4"
      >
        {pending ? "Creating account…" : otpString.length < 6 ? "Enter the 6-digit code" : "Create account"}
      </button>
    );
  };

  return (
    <AuthLayout
      title="Create account"
      subtitle="Sign up with your email — we will send a one-time code to verify."
      actionLabel="Sign up with Google"
    >
      <form
        onSubmit={
          mode === "email"
            ? requestOtp
            : (e) => {
                e.preventDefault();
                startTransition(async () => {
                  setError("");
                  // Sign up via NextAuth credentials; unknown emails get a new USER row.
                  const res = await fetch("/api/auth/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "x-callback-url": "/dashboard" },
                    body: JSON.stringify({ email: email.trim(), otp: otpString }),
                  });
                  const data = await res.json();
                  if (!res.ok) {
                    setError(data.error ?? "Could not create account.");
                    return;
                  }
                  // OTP verified server-side; complete the NextAuth session.
                  await signIn("credentials", {
                    email: email.trim(),
                    otp: otpString,
                    redirect: false,
                    callbackUrl: "/dashboard",
                  });
                  router.push("/dashboard");
                });
              }
        }
        className="space-y-4"
      >
        {error && (
          <div className="rounded-lg neu-sm p-3 text-sm text-[var(--danger)]">
            {error}
          </div>
        )}

        {mode === "email" && (
          <>
            <label className="caption">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@vu.edu.pk"
              required
              className="neu-input w-full"
            />
            <button type="submit" className="neu-btn neu-btn-accent w-full">
              Send verification code
            </button>

            <div className="auth-divider">or</div>

            <button
              type="button"
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
              className="neu-btn w-full flex items-center justify-center gap-2"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M12 5.04c1.85 0 3.5.64 4.8 1.9l3.58-3.58C18.2 1.35 15.3.25 12 .25 7.4.25 3.4 2.78 1.35 6.53l4.16 3.23C6.35 7.08 8.92 5.04 12 5.04z"
                  opacity="0.9"
                />
                <path
                  fill="currentColor"
                  d="M23.49 12.27c0-.85-.08-1.67-.22-2.46H12v4.65h6.45c-.28 1.5-1.12 2.77-2.4 3.62l3.76 2.92c2.2-2.03 3.68-5.02 3.68-8.73z"
                  opacity="0.75"
                />
                <path
                  fill="currentColor"
                  d="M5.52 14.4a7.06 7.06 0 0 1 0-4.6L1.36 6.57A11.92 11.92 0 0 0 .24 12c0 1.94.42 3.78 1.16 5.42l4.12-3.02z"
                  opacity="0.85"
                />
                <path
                  fill="currentColor"
                  d="M12 23.75c3.12 0 5.74-1.03 7.66-2.79l-3.76-2.92c-1.03.7-2.36 1.12-3.9 1.12-3.08 0-5.65-2.04-6.58-4.76l-4.16 3.23C3.4 21.22 7.4 23.75 12 23.75z"
                  opacity="0.65"
                />
              </svg>
              Sign up with Google
            </button>

            <p className="mt-4 text-center caption">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="text-[var(--accent)] font-medium underline hover:no-underline"
              >
                Sign in
              </button>
            </p>
          </>
        )}

        {mode === "otp" && (
          <>
            <p className="caption text-center">
              Check your inbox at <strong>{email}</strong> for the code.
            </p>
            <div className="otp-row" role="group" aria-label="One-time code">
              {otp.map((val, i) => (
                <input
                  key={i}
                  id={`reg-otp-${i}`}
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

            <RegisterButton />

            <p className="resend-link">
              {resendDisabled ? (
                resendLabel
              ) : (
                <button type="button" onClick={requestOtp}>
                  {resendLabel}
                </button>
              )}
            </p>

            <div className="auth-divider">or</div>

            <button
              type="button"
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
              className="neu-btn w-full flex items-center justify-center gap-2"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M12 5.04c1.85 0 3.5.64 4.8 1.9l3.58-3.58C18.2 1.35 15.3.25 12 .25 7.4.25 3.4 2.78 1.35 6.53l4.16 3.23C6.35 7.08 8.92 5.04 12 5.04z"
                  opacity="0.9"
                />
                <path
                  fill="currentColor"
                  d="M23.49 12.27c0-.85-.08-1.67-.22-2.46H12v4.65h6.45c-.28 1.5-1.12 2.77-2.4 3.62l3.76 2.92c2.2-2.03 3.68-5.02 3.68-8.73z"
                  opacity="0.75"
                />
                <path
                  fill="currentColor"
                  d="M5.52 14.4a7.06 7.06 0 0 1 0-4.6L1.36 6.57A11.92 11.92 0 0 0 .24 12c0 1.94.42 3.78 1.16 5.42l4.12-3.02z"
                  opacity="0.85"
                />
                <path
                  fill="currentColor"
                  d="M12 23.75c3.12 0 5.74-1.03 7.66-2.79l-3.76-2.92c-1.03.7-2.36 1.12-3.9 1.12-3.08 0-5.65-2.04-6.58-4.76l-4.16 3.23C3.4 21.22 7.4 23.75 12 23.75z"
                  opacity="0.65"
                />
              </svg>
              Sign up with Google
            </button>

            <p className="mt-4 text-center caption">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="text-[var(--accent)] font-medium underline hover:no-underline"
              >
                Sign in
              </button>
            </p>
          </>
        )}
      </form>
    </AuthLayout>
  );
}
