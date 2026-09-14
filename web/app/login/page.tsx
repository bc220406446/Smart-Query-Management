"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import AuthLayout from "@/components/AuthLayout";
import SocialAuthButtons from "@/components/SocialAuthButtons";
import "@/components/AuthForms.css";

export default function LoginPage() {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [error, setError] = useState(""); const [pending, setPending] = useState(false);
  async function handleSubmit(event: React.FormEvent) { event.preventDefault(); setError(""); setPending(true); const result = await signIn("credentials", { email, password, redirect: false, callbackUrl: "/dashboard" }); if (result?.error) setError("Invalid email or password."); else window.location.href = "/dashboard"; setPending(false); }
  return <AuthLayout title="Welcome back" subtitle="Sign in to manage your university queries and updates.">
    <SocialAuthButtons action="Sign in" /><div className="divider-text">or sign in with email</div>
    <form onSubmit={handleSubmit}>{error && <div className="auth-error" role="alert">{error}</div>}
      <div className="field"><label className="field-label" htmlFor="login-email">Email address</label><input id="login-email" className="field-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@vu.edu.pk" autoComplete="email" required /></div>
      <div className="field"><label className="field-label" htmlFor="login-password">Password</label><input id="login-password" className="field-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" minLength={8} autoComplete="current-password" required /></div>
      <button className="btn btn-primary w-full" type="submit" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
    </form><p className="auth-switch">New to Smart Query Hub? <a href="/register">Create an account</a></p>
  </AuthLayout>;
}
