"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import AuthLayout from "@/components/AuthLayout";
import SocialAuthButtons from "@/components/SocialAuthButtons";
import "@/components/AuthForms.css";

export default function RegisterPage() {
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [error, setError] = useState(""); const [pending, setPending] = useState(false);
  async function handleSubmit(event: React.FormEvent) { event.preventDefault(); setError(""); setPending(true); const response = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, password }) }); const data = await response.json(); if (!response.ok) { setError(data.error ?? "Could not create your account."); setPending(false); return; } const result = await signIn("credentials", { email, password, redirect: false, callbackUrl: "/dashboard" }); if (result?.error) setError("Account created, but sign-in failed. Please sign in again."); else window.location.href = "/dashboard"; setPending(false); }
  return <AuthLayout title="Create your account" subtitle="Choose a provider or use your email to get started.">
    <SocialAuthButtons action="Sign up" /><div className="divider-text">or create an account with email</div>
    <form onSubmit={handleSubmit}>{error && <div className="auth-error" role="alert">{error}</div>}
      <div className="field"><label className="field-label" htmlFor="register-name">Full name</label><input id="register-name" className="field-input" value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" autoComplete="name" required /></div>
      <div className="field"><label className="field-label" htmlFor="register-email">Email address</label><input id="register-email" className="field-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@vu.edu.pk" autoComplete="email" required /></div>
      <div className="field"><label className="field-label" htmlFor="register-password">Password</label><input id="register-password" className="field-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" minLength={8} autoComplete="new-password" required /></div>
      <button className="btn btn-primary w-full" type="submit" disabled={pending}>{pending ? "Creating account…" : "Create account"}</button>
    </form><p className="auth-switch">Already have an account? <a href="/login">Sign in</a></p>
  </AuthLayout>;
}
