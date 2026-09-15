import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/roles";
import { StatusBadge } from "@/components/QueryStatusBadge";
import { overrideQuery } from "./actions";

export const dynamic = "force-dynamic";

const STATUS_OPTIONS = [
  "SUBMITTED",
  "CLASSIFYING",
  "ROUTED",
  "IN_PROGRESS",
  "RESOLVED",
  "ESCALATED",
  "CLOSED",
];

export default async function HodConsolePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireRole([Role.HOD, Role.ADMIN]);
  const { error } = await searchParams;

  const [escalated, openQueries, assignees] = await Promise.all([
    prisma.query.findMany({
      where: { status: "ESCALATED" },
      orderBy: { escalatedAt: "desc" },
      include: { student: { select: { name: true } }, assignedTo: { select: { name: true } } },
    }),
    prisma.query.findMany({
      where: { status: { in: ["SUBMITTED", "CLASSIFYING", "ROUTED", "IN_PROGRESS"] } },
      orderBy: { createdAt: "asc" },
      take: 20,
      include: { student: { select: { name: true } }, assignedTo: { select: { name: true } } },
    }),
    prisma.user.findMany({
      where: { role: { in: [Role.INSTRUCTOR, Role.HOD] } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, role: true },
    }),
  ]);

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
            FR-07 escalated queries and FR-09 override / reassignment authority.
          </p>
        </div>
      </div>

      {error && (
        <div className="error-box" style={{ marginBottom: 20 }}>
          {error}
        </div>
      )}

      <section style={{ marginTop: 8 }}>
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
      </section>

      <section style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
          Open queries
        </h2>
        <div className="table-wrap">
          {openQueries.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon" aria-hidden="true">-</span>
              No open queries.
            </div>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: "8px 0" }}>
              {openQueries.map((q) => (
                <li
                  key={q.id}
                  className="card"
                  style={{
                    padding: "12px 14px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
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
                      <p className="mono-sm">
                        {q.student?.name ?? "Anonymous"} ·{" "}
                        {q.assignedTo?.name ?? "unassigned"} ·
                        {new Date(q.createdAt).toLocaleString()}
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
      </section>
    </main>
  );
}
