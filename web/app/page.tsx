import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BrainCircuit, Clock3, Route, Sparkles, Users } from "lucide-react";
import { auth } from "@/lib/auth";
import LandingAccuracyChart from "@/components/LandingAccuracyChart";
import BrandMark from "@/components/BrandMark";
import ThemeToggle from "@/components/ThemeToggle";

const benefits = [
  { label: "AI-powered classification", icon: BrainCircuit },
  { label: "Automatic instructor routing", icon: Route },
  { label: "Transparent status updates", icon: Clock3 },
];

export default async function Home() {
  const session = await auth();
  if (session?.user) {
    const role = session.user.role;
    redirect(role === "STUDENT" ? "/dashboard" : role === "INSTRUCTOR" ? "/staff" : role === "HOD" ? "/hod" : "/admin");
  }

  return (
    <main className="landing-community-page">
      <div className="landing-theme-toggle"><ThemeToggle /></div>
      <section className="landing-community-hero">
        <div className="landing-community-brand">
          <BrandMark size={34} />
          <span>Smart Query Hub</span>
        </div>
        <div className="landing-community-glow" aria-hidden="true" />
        <div className="landing-community-badge">
          <span />
          Smarter support for every student
        </div>
        <h1>
          Every question deserves
          <br />
          a clear answer.
        </h1>
        <p className="landing-community-lede">
          A smarter way for students and university teams to ask, route, track,
          and resolve every question together.
        </p>
        <div
          className="landing-community-people"
          aria-label="Built for students and university teams"
        >
          <img src="https://i.pravatar.cc/80?img=12" alt="Student user" />
          <img src="https://i.pravatar.cc/80?img=32" alt="University team member" />
          <img src="https://i.pravatar.cc/80?img=47" alt="Instructor user" />
          <img src="https://i.pravatar.cc/80?img=5" alt="Staff user" />
          <b>+99</b>
        </div>
        <p className="landing-community-proof">
          <Users size={15} /> Designed for students, instructors, and university
          teams
        </p>
        <div className="landing-community-actions">
          <Link href="/login" className="landing-community-primary">
            Get started
          </Link>
          <Link href="#project" className="landing-community-secondary">
            <span>Explore project <ArrowRight size={17} /></span>
          </Link>
        </div>
        <p className="landing-community-note">
          Free to use · One shared workspace · No complexity
        </p>
      </section>

      <section
        className="landing-community-stats"
        aria-label="Project highlights"
      >
        <div>
          <strong>92%</strong>
          <span>Routing accuracy</span>
        </div>
        <div>
          <strong>30s</strong>
          <span>AI processing cycle</span>
        </div>
        <div>
          <strong>24/7</strong>
          <span>Query visibility</span>
        </div>
      </section>

      <section id="project" className="landing-project-section">
        <div className="landing-project-copy">
          <p className="landing-section-kicker">
            <Sparkles size={14} /> ABOUT THE PROJECT
          </p>
          <h2>
            Built to make university support feel simple.
          </h2>
          <p>
            Smart Query Hub brings every student question into one calm,
            transparent workflow. AI understands the request, identifies the
            right department, and forwards it to the instructor best placed to
            help.
          </p>
          <ul>
            {benefits.map(({ label, icon: Icon }) => (
              <li key={label}>
                <span>
                  <Icon size={14} />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </div>
        <LandingAccuracyChart />
      </section>
    </main>
  );
}
