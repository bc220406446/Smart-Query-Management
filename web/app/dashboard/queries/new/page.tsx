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
            Your query is classified by AI, routed to the right department, and you
            will be notified as it moves toward resolution.
          </p>
        </div>
      </div>

      {error && (
        <div className="error-box" style={{ marginBottom: 20 }}>
          {error}
        </div>
      )}

      <form action={submitQuery} className="grid-2" style={{ marginTop: 8 }}>
        <div style={{ flex: 2 }}>
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
              placeholder="Describe your query in detail — the more context, the better the AI routing."
              className="field-textarea"
            />
          </div>
        </div>

        <div
          style={{
            alignSelf: "flex-start",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div className="card" style={{ padding: "16px 20px" }}>
            <p className="field-label" style={{ marginBottom: 4 }}>
              What happens next
            </p>
            <ul
              style={{
                margin: 0,
                padding: 0,
                listStyle: "none",
                fontSize: 13,
                color: "var(--text-secondary)",
                lineHeight: 1.7,
              }}
            >
              <li>AI classifies intent and urgency</li>
              <li>Query is routed to the right department</li>
              <li>You get notified at each stage</li>
              <li>Staff can send AI-drafted replies</li>
            </ul>
          </div>

          <button type="submit" className="btn btn-primary btn-lg">
            Submit query
          </button>
        </div>
      </form>
    </main>
  );
}
