import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/roles";
import { STAFF_ROLES } from "@/lib/roles";
import { PriorityBadge, StatusBadge } from "@/components/QueryStatusBadge";
import QueryHandlingActions from "@/components/QueryHandlingActions";
import ReportExportActions from "@/components/ReportExportActions";
import { deleteQuery } from "./actions";

export const dynamic = "force-dynamic";

export default async function StaffQueryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; from?: string }>;
}) {
  const user = await requireRole([...STAFF_ROLES]);
  const { id } = await params;
  const { error, from } = await searchParams;

  const hodDepartmentId = user.role === "HOD"
    ? (await prisma.user.findUnique({ where: { id: user.id }, select: { departmentId: true } }))?.departmentId
    : null;

  const query = await prisma.query.findFirst({
    where: user.role === "ADMIN"
      ? { id }
      : {
          id,
          OR: [
            { assignedToId: user.id },
            { status: { in: ["AUTO_ESCALATED", "HOD_ESCALATED", "FORWARDED_TO_HOD", "FORWARDED_TO_STAFF"] } },
            ...(from === "all-queries" && hodDepartmentId ? [{ departmentId: hodDepartmentId }] : []),
          ],
        },
    include: {
      student: { select: { name: true, email: true } },
      replies: { orderBy: { createdAt: "asc" }, include: { author: { select: { name: true } } } },
      department: { select: { name: true } },
      assignedTo: { select: { name: true, isOnLeave: true } },
    },
  });

  if (!query) notFound();
  const hiddenDraft = query?.aiDraftReply;
  const displayCategory = query?.category;
  const displayConfidence = query?.confidence;

  const recipients = user.role === "HOD" || user.role === "ADMIN" ? await prisma.user.findMany({ where: user.role === "ADMIN" ? { role: { in: ["INSTRUCTOR", "HOD"] } } : { OR: [{ role: "INSTRUCTOR", hodId: user.id }, { role: "HOD" }] }, orderBy: { name: "asc" }, select: { id: true, name: true, role: true } }) : [];

  const resolved = query.status === "RESOLVED";
  const canRespond = from !== "all-queries" && user.role !== "ADMIN" && !resolved && (user.role === "HOD" || !["FORWARDED_TO_HOD", "AUTO_ESCALATED", "HOD_ESCALATED"].includes(query.status));
  const showExport = user.role === "ADMIN" || from === "all-queries";
  const instructorOnLeave = user.role === "INSTRUCTOR" && query.assignedToId === user.id && query.assignedTo?.isOnLeave === true;

  return (
    <main className="container-page" style={{ maxWidth: 880 }}>
      <h1
        style={{
          fontSize: 24,
          fontWeight: 600,
          color: "var(--text-primary)",
          margin: "0 0 12px",
          letterSpacing: "-0.01em",
        }}
      >
        {query.subject}
      </h1>

      <section className="ai-classification-card card" aria-labelledby="classification-heading">
        <div className="query-section-kicker">AI insight</div>
        <h2 id="classification-heading" className="card-title">AI Classification Overview</h2>
        <div className="query-info-grid ai-classification-grid">
          <div><span className="query-meta-label">Detected classification</span><strong>{displayCategory ?? "Pending classification"}</strong></div>
          <div><span className="query-meta-label">Confidence</span><strong>{displayConfidence != null ? `${(displayConfidence * 100).toFixed(0)}%` : "Not available"}</strong></div>
        </div>
      </section>

      <section className="query-info-card card" aria-labelledby="query-info-heading">
        <div className="query-section-kicker">Submitted query</div>
        <h2 id="query-info-heading" className="card-title">Student Info</h2>
        <div className="query-student-meta">
        <div><span className="query-meta-label">Student Name</span><strong>{query.student?.name ?? "Anonymous"}</strong></div>
        <div><span className="query-meta-label">Student Email</span><strong>{query.student?.email ?? "No email available"}</strong></div>
        <div><span className="query-meta-label">Department</span><strong>{query.department?.name ?? "Unassigned"}</strong></div>
        </div>
        <div className="query-subsection-title">Query Info</div>
        <div className="query-info-grid">
          <div><span className="query-meta-label">Ticket No.</span><span className="mono-sm">#{query.ticketNumber.slice(0, 8)}</span></div>
          <div><span className="query-meta-label">Submit Channel</span><span>{query.channel}</span></div>
          <div><span className="query-meta-label">Priority</span><PriorityBadge priority={query.priority} /></div>
          <div><span className="query-meta-label">Status</span><StatusBadge status={query.status} /></div>
          <div><span className="query-meta-label">Submission Date</span><span>{new Date(query.createdAt).toLocaleDateString()}</span></div>
          <div><span className="query-meta-label">Submission Time</span><span>{new Date(query.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span></div>
        </div>
      </section>

      {error && (
        <div className="error-box" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      

      {false && displayCategory && (
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
          {displayCategory}
          {displayConfidence != null && (
            <span style={{ color: "var(--text-tertiary)" }}>
              ·
              {((displayConfidence ?? 0) * 100).toFixed(0)}% confidence
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

      {false && hiddenDraft && !resolved && (
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
              ✨ AI-drafted reply
            </span>
            <span className="caption">AI reply is prefilled below for editing</span>
          </div>
          <p style={{ whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.6, color: "var(--text-primary)" }}>{hiddenDraft}</p>
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

      <div className="modal-actions" style={{ marginTop: 20 }}>{showExport && <ReportExportActions queryId={query.id} />}{user.role === "ADMIN" && <form action={deleteQuery.bind(null, query.id)}><button type="submit" className="btn btn-danger">Delete query</button></form>}</div>
      {canRespond && <QueryHandlingActions queryId={query.id} aiDraftReply={query.aiDraftReply} recipients={recipients} isHod={user.role === "HOD" || user.role === "ADMIN"} disabled={instructorOnLeave} />}
    </main>
  );
}
