import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/roles";
import { PriorityBadge, StatusBadge } from "@/components/QueryStatusBadge";
import QueryStatusPoller from "@/components/QueryStatusPoller";

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
        }}
      >
        <span>Submitted {new Date(query.createdAt).toLocaleString()}</span>
        <span>
          Routed to {query.assignedTo?.name ?? "-"} (
          {query.department?.name ?? "unassigned"})
        </span>
      </div>

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
          {query.message}
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
