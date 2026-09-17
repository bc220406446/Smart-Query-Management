import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/roles";
import { StatusBadge } from "@/components/QueryStatusBadge";
import { overrideQuery } from "./actions";
import HodQueryTable from "@/components/HodQueryTable";

export const dynamic = "force-dynamic";

const STATUS_OPTIONS = [
  "SUBMITTED",
  "ASSIGNED",
  "IN_PROGRESS",
  "RESOLVED",
  "AUTO_ESCALATED",
  "HOD_ESCALATED",
  "FORWARDED_TO_HOD",
];

export default async function HodConsolePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireRole([Role.HOD, Role.ADMIN]);
  const { error } = await searchParams;

  // Keep the HOD console correct even when the background AI scheduler is
  // temporarily unavailable. The scheduler performs the same transition.
  const escalationCutoff = new Date();
  escalationCutoff.setHours(escalationCutoff.getHours() - 24);
  await prisma.query.updateMany({
    where: {
      status: { in: ["SUBMITTED", "ASSIGNED", "IN_PROGRESS"] },
      updatedAt: { lt: escalationCutoff },
      ...(user.role === Role.HOD ? { assignedTo: { hodId: user.id } } : {}),
    },
    data: { status: "AUTO_ESCALATED", escalatedAt: new Date() },
  });

  const [openQueries, assignees] = await Promise.all([
    prisma.query.findMany({
      where: user.role === Role.ADMIN ? { status: { in: ["SUBMITTED", "ASSIGNED", "IN_PROGRESS"] } } : { status: { in: ["SUBMITTED", "ASSIGNED", "IN_PROGRESS"] }, assignedTo: { hodId: user.id } },
      orderBy: { createdAt: "asc" },
      take: 20,
      include: { student: { select: { name: true } }, assignedTo: { select: { name: true } } },
    }),
    prisma.user.findMany({
      where: user.role === Role.ADMIN ? { role: { in: [Role.INSTRUCTOR, Role.HOD] } } : { role: Role.INSTRUCTOR, hodId: user.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true, role: true },
    }),
  ]);
  const escalated = openQueries;

  function OverrideForm({ query }: { query: (typeof openQueries)[number] }) {
    return (
      <form
        action={overrideQuery}
        className="card"
        style={{ padding: "12px 14px", marginTop: 10 }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <input type="hidden" name="queryId" value={query.id} />
          <span style={{ fontSize: 11, color: "var(--text-tertiary)", marginRight: 4 }}>
            Status:
          </span>
          <select
            name="status"
            defaultValue={query.status}
            className="field-select"
            style={{ padding: "6px 28px 6px 10px", fontSize: 12 }}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
          <span style={{ fontSize: 11, color: "var(--text-tertiary)", marginRight: 4 }}>
            Assign to:
          </span>
          <select
            name="assignedToId"
            defaultValue={query.assignedToId ?? ""}
            className="field-select"
            style={{ padding: "6px 28px 6px 10px", fontSize: 12 }}
          >
            <option value="">- assign -</option>
            {assignees.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.role})
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="btn btn-primary btn-sm"
            style={{ marginLeft: "auto" }}
          >
            Apply
          </button>
        </div>
      </form>
    );
  }

  return (
    <main className="container-page">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">HOD Console</h1>
          <p className="page-subtitle">
            Review open queries and escalate them to your HOD inbox when needed.
          </p>
        </div>
      </div>

      {error && (
        <div className="error-box" style={{ marginBottom: 20 }}>
          {error}
        </div>
      )}

      {false && <section style={{ marginTop: 8 }}>
        <h2
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "var(--danger)",
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 16 }}>⚠️</span>
          Escalated (awaiting 24h or manual escalation)
        </h2>
        <div className="table-wrap">
          {escalated.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon" aria-hidden="true">-</span>
              No escalated queries.
            </div>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: "8px 0" }}>
              {escalated.map((q) => (
                <li
                  key={q.id}
                  className="card"
                  style={{
                    padding: "12px 14px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    borderColor: "var(--danger-border)",
                    borderWidth: 1,
                    background: "var(--danger-bg)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontWeight: 500,
                          color: "var(--text-primary)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          marginBottom: 4,
                        }}
                      >
                        {q.subject}
                      </p>
                      <p className="mono-sm" style={{ marginBottom: 2 }}>
                        {q.student?.name ?? "Anonymous"} · escalated{" "}
                        {q.escalatedAt
                          ? new Date(q.escalatedAt).toLocaleString()
                          : "-"}
                      </p>
                    </div>
                    <StatusBadge status={q.status} />
                  </div>
                  <OverrideForm query={q} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>}

      <section style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
          Open queries
        </h2>
        <HodQueryTable queries={openQueries.map((q) => ({ id: q.id, subject: q.subject, student: q.student?.name ?? "Anonymous", assignedTo: q.assignedTo?.name ?? "Unassigned", priority: q.priority, status: q.status, message: q.message, createdAt: q.createdAt.toISOString() }))} />
      </section>
    </main>
  );
}
