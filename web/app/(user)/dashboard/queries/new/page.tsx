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
    <main className="container-page">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Submit a Query</h1>
          <p className="page-subtitle">
            Your query is classified by AI, routed to the right department, and
            you will be notified as it moves toward resolution.
          </p>
        </div>
      </div>

      {error && (
        <div className="error-box" style={{ marginBottom: 20 }}>
          {error}
        </div>
      )}

      <form action={submitQuery} className="new-query-form">
          <div className="field" style={{ marginBottom: 16 }}>
            <label htmlFor="subject" className="field-label">
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
              className="field-input"
            />
          </div>

          <div className="field">
            <label htmlFor="message" className="field-label">
              Details
            </label>
            <textarea
              id="message"
              name="message"
              required
              minLength={20}
              maxLength={5000}
              rows={10}
              placeholder="Describe your query in detail - the more context, the better the AI routing."
              className="field-textarea"
            />
          </div>
        <div className="new-query-actions">
          <button type="submit" className="btn btn-primary btn-lg">Submit query</button>
        </div>
      </form>
    </main>
  );
}
