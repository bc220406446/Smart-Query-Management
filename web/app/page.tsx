import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

const capabilities = [
  { number: "01", title: "Intelligent routing", body: "Understand every request, identify its urgency, and send it to the right team automatically." },
  { number: "02", title: "A clear path to resolution", body: "Give students visibility at every stage, from submission to response and resolution." },
  { number: "03", title: "Faster work for teams", body: "Give staff context-rich drafts and a focused workspace for the conversations that matter." },
];

export default async function Home() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <main className="landing-page">
      <header className="landing-header">
        <Link href="/" className="landing-brand" aria-label="Smart Query Hub home">
          <span className="landing-mark">SQ</span><span>Smart Query Hub</span>
        </Link>
        <Link href="/login" className="landing-header-link">Get started <span aria-hidden="true">↗</span></Link>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-copy">
          <p className="landing-eyebrow"><span />A better way to be heard</p>
          <h1>Every question deserves a clear answer.</h1>
          <p className="landing-lede">Smart Query Hub brings student questions and university teams into one thoughtful, transparent workflow-so nothing gets lost and everyone knows what happens next.</p>
          <div className="landing-actions">
            <Link href="/login" className="landing-primary-action">Get started <span aria-hidden="true">→</span></Link>
            <span className="landing-action-note">Simple for students. Powerful for teams.</span>
          </div>
        </div>

        <div className="landing-visual" aria-label="Query workflow preview">
          <div className="landing-orbit landing-orbit-one" /><div className="landing-orbit landing-orbit-two" />
          <div className="landing-preview-card">
            <div className="landing-preview-topline"><span className="landing-status-dot" /><span>Query workspace</span><span className="landing-preview-menu">•••</span></div>
            <div className="landing-preview-title">Where can I find my course schedule?</div>
            <div className="landing-preview-meta">Academic services <span>·</span> Submitted moments ago</div>
            <div className="landing-progress"><span /></div>
            <div className="landing-preview-bottom"><span className="landing-pill">Classifying</span><span className="landing-avatar">AS</span></div>
          </div>
          <div className="landing-floating-card landing-floating-top"><span className="landing-mini-icon">✦</span><span><strong>Smart routing</strong><small>Academic services</small></span></div>
          <div className="landing-floating-card landing-floating-bottom"><span className="landing-check">✓</span><span><strong>Clear next steps</strong><small>Keep everyone informed</small></span></div>
        </div>
      </section>

      <section className="landing-trust-row"><span>BUILT FOR BETTER COMMUNICATION</span><span>ONE SHARED WORKSPACE</span><span>DESIGNED AROUND PEOPLE</span></section>

      <section className="landing-capabilities">
        <div className="landing-section-intro"><p className="landing-eyebrow"><span />Everything in one place</p><h2>From first question to final resolution.</h2></div>
        <div className="landing-capability-grid">
          {capabilities.map((item) => <article key={item.number} className="landing-capability"><span className="landing-capability-number">{item.number}</span><h3>{item.title}</h3><p>{item.body}</p></article>)}
        </div>
      </section>
    </main>
  );
}
