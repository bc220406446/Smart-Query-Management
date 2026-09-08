import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import SignInButton from "@/components/SignInButton";

export default async function Home() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5">
        <span className="flex items-center gap-2 text-sm font-semibold text-white">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-600 text-xs font-bold">
            SQ
          </span>
          Smart Query Hub
        </span>
        <SignInButton />
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center px-4 pb-20 text-center">
        <h1 className="mt-16 max-w-3xl text-4xl font-bold tracking-tight text-white sm:text-5xl">
          One inbox for every university query.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-slate-400">
          Submit a question to any department, let AI classify and route it to the
          right person, and track it to resolution — from a single dashboard.
        </p>

        <div className="mt-10">
          <SignInButton />
        </div>

        <div className="mt-16 grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3">
          {[
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
          ].map((f) => (
            <div key={f.title} className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-left">
              <h2 className="text-sm font-semibold text-white">{f.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{f.body}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        Smart Query Routing &amp; Email Automation System — FYP (supervisor: Saima Jamil)
      </footer>
    </div>
  );
}