import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import NavBar from "@/components/NavBar";
import PageTransition from "@/components/PageTransition";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart Query Hub - University Communication",
  description:
    "AI-powered query routing and email automation for universities. Submit, track, and resolve queries across departments.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  let initialTheme = "light";
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("sqh-theme");
      if (stored === "light" || stored === "dark") initialTheme = stored;
      else if (window.matchMedia("(prefers-color-scheme: dark)").matches) initialTheme = "dark";
    } catch {}
  }

  return (
    <html lang="en" data-theme={initialTheme} suppressHydrationWarning>
      <body className="antialiased">
        {session?.user ? <NavBar user={session.user} /> : null}
        <PageTransition>{children}</PageTransition>
      </body>
    </html>
  );
}
