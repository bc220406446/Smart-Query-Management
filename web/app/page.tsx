import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import SignInButton from "@/components/SignInButton";

export default async function Home() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const features = [
    {
      title: "AI routing",
      body: "Gemini + Claude classify intent and urgency, then route to the right department or instructor automatically.",
    },
    {
      title: "Live status tracking",
      body: "Every query shows its current stage in real time, with automatic escalation if nothing happens in 24 hours.",
    },
    {
      title: "Draft replies for staff",
      body: "Staff review and send AI-drafted replies instead of writing every response from scratch.",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* Top bar */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          height: 56,
          background: "var(--bg-elevated)",
          borderBottom: "1px solid var(--border-light)",
          boxShadow: "var(--shadow-xs)",
        }}
      >
        <a
          href="/dashboard"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 15,
            fontWeight: 600,
            color: "var(--text-primary)",
            textDecoration: "none",
          }}
        >
          <span
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 28,
              borderRadius: 8,
              background: "var(--brand-500)",
              color: "var(--brand-contrast)",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            SQ
          </span>
          Smart Query Hub
        </a>
        <SignInButton />
      </header>

      <main style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "64px 24px 40px", textAlign: "center" }}>
        <div style={{ width: "100%", maxWidth: 760 }}>
          <h1
            style={{
              fontSize: 42,
              fontWeight: 700,
              color: "var(--text-primary)",
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              margin: "0 auto 16px",
            }}
          >
            One inbox for every university query.
          </h1>
          <p style={{ fontSize: 17, color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 auto 36px", maxWidth: 540 }}>
            Submit a question to any department, let AI classify and route it to the
            right person, and track it to resolution — from a single dashboard.
          </p>

          <SignInButton callbackUrl="/dashboard" />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 16,
              marginTop: 56,
            }}
          >
            {features.map((f) => (
              <div
                key={f.title}
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-light)",
                  borderRadius: "var(--radius-lg)",
                  padding: "22px 20px",
                  boxShadow: "var(--shadow-xs)",
                  textAlign: "left",
                }}
              >
                <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>
                  {f.title}
                </h2>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer
        style={{
          marginTop: "auto",
          padding: "16px 24px",
          borderTop: "1px solid var(--border-light)",
          textAlign: "center",
          fontSize: 11,
          color: "var(--text-tertiary)",
        }}
      >
        Smart Query Routing &amp; Email Automation System — FYP (supervisor: Saima Jamil)
      </footer>
    </div>
  );
}