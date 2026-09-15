import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/roles";
import { STAFF_ROLES } from "@/lib/roles";
import { PriorityBadge, StatusBadge } from "@/components/QueryStatusBadge";
import { sendReply, approveAiDraft } from "./actions";

export const dynamic = "force-dynamic";

export default async function StaffQueryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireRole([...STAFF_ROLES]);
  const { id } = await params;
  const { error } = await searchParams;

  const query = await prisma.query.findFirst({
    where: { id, OR: [{ assignedToId: user.id }, { status: "ESCALATED" }] },
    include: {
      student: { select: { name: true, email: true } },
      replies: { orderBy: { createdAt: "asc" }, include: { author: { select: { name: true } } } },
      department: { select: { name: true } },
    },
  });

  if (!query) notFound();

  const resolved = query.status === "RESOLVED" || query.status === "CLOSED";

  return (
    <main className="container-page" style={{ maxWidth: 880 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 8,
        }}
      >
        <span className="mono-sm">Ticket #{query.ticketNumber.slice(0, 8)}</span>
        <StatusBadge status={query.status} />
        <PriorityBadge priority={query.priority} />
      </div>

      <h1
        style={{
          fontSize: 24,
          fontWeight: 600,
          color: "var(--text-primary)",
          margin: "0 0 6px",
          letterSpacing: "-0.01em",
        }}
      >
        {query.subject}
      </h1>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          fontSize: 12,
          color: "var(--text-tertiary)",
          marginBottom: 20,
          flexWrap: "wrap",
        }}
      >
        <span>
          From {query.student?.name ?? "Anonymous"} (
          {query.student?.email ?? "no email"})
        </span>
        <span>{query.department?.name ?? "Unassigned"}</span>
        <span>{query.channel} channel</span>
        <span>Submitted {new Date(query.createdAt).toLocaleString()}</span>
      </div>

      {error && (
        <div className="error-box" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      {query.category && (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 16,
            padding: "4px 12px",
            background: "var(--bg-sunken)",
            border: "1px solid var(--border-light)",
            borderRadius: "var(--radius-full)",
            fontSize: 11,
            fontWeight: 600,
            color: "var(--text-secondary)",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          {query.category}
          {query.confidence != null && (
            <span style={{ color: "var(--text-tertiary)" }}>
              ·
              {(query.confidence * 100).toFixed(0)}% confidence
            </span>
          )}
        </div>
      )}

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <span className="card-title">Student message</span>
        </div>
        <p
          style={{
            whiteSpace: "pre-wrap",
            fontSize: 14,
            lineHeight: 1.6,
            color: "var(--text-primary)",
          }}
        >
          {query.message}
        </p>
      </div>

      {query.aiDraftReply && !resolved && (
        <div
          className="card"
          style={{
            borderColor: "var(--warning-border)",
            borderWidth: 1,
            background: "var(--warning-bg)",
            marginBottom: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <span
              className="section-label"
              style={{ color: "var(--warning)", textTransform: "uppercase" }}
            >
              ✨ AI-drafted reply (FR-05)
            </span>
            <form action={approveAiDraft.bind(null, query.id)}>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                style={{ background: "var(--warning)", borderColor: "var(--warning)" }}
              >
                Approve &amp; send
              </button>
            </form>
          </div>
          <p
            style={{
              whiteSpace: "pre-wrap",
              fontSize: 14,
              lineHeight: 1.6,
              color: "var(--text-primary)",
            }}
          >
            {query.aiDraftReply}
          </p>
        </div>
      )}

      <h3
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: "var(--text-primary)",
          marginBottom: 12,
        }}
      >
        Replies
      </h3>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {query.replies.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "28px 16px" }}>
            <p style={{ color: "var(--text-tertiary)", fontSize: 13 }}>
              No replies yet.
            </p>
          </div>
        ) : (
          query.replies.map((r) => (
            <div key={r.id} className="card">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: 11,
                  marginBottom: 8,
                }}
              >
                <span
                  style={{
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {r.author?.name ?? "System"}
                </span>
                <span className="mono-sm">
                  {new Date(r.createdAt).toLocaleString()}
                </span>
              </div>
              <p
                style={{
                  whiteSpace: "pre-wrap",
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: "var(--text-primary)",
                }}
              >
                {r.body}
              </p>
            </div>
          ))
        )}
      </div>

      {!resolved && (
        <form
          action={sendReply.bind(null, query.id)}
          style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 12 }}
        >
          <div className="field">
            <label htmlFor="body" className="field-label">
              Write a reply
            </label>
            <textarea
              id="body"
              name="body"
              required
              minLength={1}
              rows={6}
              className="field-textarea"
              placeholder="Sending a reply marks the query as resolved."
            />
          </div>
          <button type="submit" className="btn btn-primary btn-lg">
            Send reply
          </button>
        </form>
      )}
    </main>
  );
}
