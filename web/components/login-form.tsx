"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import SocialAuthButtons from "@/components/SocialAuthButtons";

export function LoginForm({ className, ...props }: React.ComponentProps<"div">) {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [error, setError] = useState(""); const [pending, setPending] = useState(false);
  async function submit(event: React.FormEvent) { event.preventDefault(); setError(""); setPending(true); const result = await signIn("credentials", { email, password, redirect: false, callbackUrl: "/dashboard" }); if (result?.error) setError("Invalid email or password."); else window.location.href = "/dashboard"; setPending(false); }
  return <div className={className} {...props}><Card className="auth-shadcn-card"><CardHeader><p className="auth-kicker">SMART QUERY HUB</p><CardTitle>Welcome back</CardTitle><CardDescription>Sign in to manage your university queries and updates.</CardDescription></CardHeader><CardContent><SocialAuthButtons action="Sign in" /><div className="divider-text">or sign in with email</div><form onSubmit={submit}>{error && <div className="auth-error" role="alert">{error}</div>}<FieldGroup><Field><FieldLabel htmlFor="login-email">Email address</FieldLabel><Input id="login-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@vu.edu.pk" autoComplete="email" required /></Field><Field><FieldLabel htmlFor="login-password">Password</FieldLabel><Input id="login-password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" minLength={8} autoComplete="current-password" required /></Field><Button className="btn btn-primary w-full" type="submit" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</Button></FieldGroup></form><FieldDescription className="auth-switch">New to Smart Query Hub? <a href="/register">Create an account</a></FieldDescription></CardContent></Card></div>;
}
