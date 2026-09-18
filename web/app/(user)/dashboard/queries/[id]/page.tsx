import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/roles";
import { PriorityBadge, StatusBadge } from "@/components/QueryStatusBadge";
import QueryStatusPoller from "@/components/QueryStatusPoller";
import { splitIncomingQuery } from "@/lib/query-submission";

export const dynamic = "force-dynamic";

export default async function QueryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ submitted?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { submitted } = await searchParams;

  const query = await prisma.query.findFirst({
    where: { id, studentId: user.id },
    include: {
      replies: { orderBy: { createdAt: "asc" }, include: { author: { select: { name: true } } } },
      assignedTo: { select: { name: true } },
      department: { select: { name: true } },
    },
  });

  if (!query) notFound();
  const display = splitIncomingQuery(query.subject, query.message);

  return (
    <main className="container-page" style={{ maxWidth: 880 }}>
      <h1
        style={{
          fontSize: 24,
          fontWeight: 600,
          color: "var(--text-primary)",
          margin: "0 0 6px",
          letterSpacing: "-0.01em",
        }}
      >
        {display.subject}
      </h1>

      <p className="page-subtitle" style={{ marginBottom: 20 }}>
        Your submitted query and conversation history.
      </p>

      <section className="query-info-card card" aria-labelledby="query-info-heading">
        <div className="query-section-kicker">Query overview</div>
        <h2 id="query-info-heading" className="card-title">Query Information</h2>
        <div className="query-info-grid">
          <div><span className="query-meta-label">Ticket No.</span><span className="mono-sm">#{query.ticketNumber.slice(0, 8)}</span></div>
          <div><span className="query-meta-label">Submit Channel</span><span>{query.channel}</span></div>
          <div><span className="query-meta-label">Priority</span><PriorityBadge priority={query.priority} /></div>
          <div><span className="query-meta-label">Status</span><StatusBadge status={query.status} /></div>
          <div><span className="query-meta-label">Submission Date</span><span>{new Date(query.createdAt).toLocaleDateString()}</span></div>
          <div><span className="query-meta-label">Submission Time</span><span>{new Date(query.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span></div>
          <div><span className="query-meta-label">Assigned To</span><span>{query.assignedTo?.name ?? "Pending assignment"}</span></div>
          <div><span className="query-meta-label">Department</span><span>{query.department?.name ?? "Pending classification"}</span></div>
        </div>
      </section>

      {submitted === "1" && (
        <div className="success-box" style={{ marginBottom: 20 }}>
          Query submitted! It has been queued for AI classification and routing.
        </div>
      )}

      <QueryStatusPoller queryId={query.id} currentStatus={query.status} />

      <div className="card" style={{ marginTop: 8 }}>
        <div className="card-header">
          <span className="card-title">Your message</span>
        </div>
        <p
          style={{
            whiteSpace: "pre-wrap",
            fontSize: 14,
            lineHeight: 1.6,
            color: "var(--text-primary)",
          }}
        >
          {display.message}
        </p>
      </div>

      <h3
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: "var(--text-primary)",
          marginTop: 28,
          marginBottom: 12,
        }}
      >
        Conversation &amp; updates
      </h3>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {query.replies.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "28px 16px" }}>
            <p style={{ color: "var(--text-tertiary)", fontSize: 13 }}>
              No replies yet. Your query is being handled - you will be notified
              when there is an update.
            </p>
          </div>
        ) : (
          query.replies.map((r) => (
            <div
              key={r.id}
              className="card"
              style={{
                borderColor:
                  r.isAiDraft
                    ? "var(--warning-border)"
                    : "var(--border-light)",
                borderWidth: 1,
                background:
                  r.isAiDraft
                    ? "var(--warning-bg)"
                    : "var(--bg-elevated)",
              }}
            >
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
                    color:
                      r.isAiDraft
                        ? "var(--warning)"
                        : "var(--text-secondary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {r.isAiDraft
                    ? "AI draft (pending staff review)"
                    : r.author?.name ?? "Staff"}
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
    </main>
  );
}
