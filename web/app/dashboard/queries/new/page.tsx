import { requireUser } from "@/lib/roles";
import { submitQuery } from "./actions";

export const dynamic = "force-dynamic";

export default async function NewQueryPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireUser();
  const { error } = await searchParams;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold text-white">Submit a Query</h1>
      <p className="mt-1 text-sm text-slate-400">
        Your query is classified by AI, routed to the right department, and you&apos;ll be
        notified as it moves toward resolution.
      </p>

      {error && (
        <p className="mt-4 rounded-lg border border-rose-800 bg-rose-950/40 px-4 py-3 text-sm text-rose-300">
          {error}
        </p>
      )}

      <form action={submitQuery} className="mt-6 space-y-5">
        <div>
          <label htmlFor="subject" className="block text-sm font-medium text-slate-300">
            Subject
          </label>
          <input
            id="subject"
            name="subject"
            type="text"
            required
            minLength={5}
            maxLength={200}
            placeholder="e.g. How do I register for CS302?"
            className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="message" className="block text-sm font-medium text-slate-300">
            Details
          </label>
          <textarea
            id="message"
            name="message"
            required
            minLength={20}
            maxLength={5000}
            rows={8}
            placeholder="Describe your query in detail — the more context, the better the AI routing."
            className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
        >
          Submit query
        </button>
      </form>
    </main>
  );
}