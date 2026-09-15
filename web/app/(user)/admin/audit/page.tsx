import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function AuditLogPage() {
  await requireRole([Role.ADMIN]);
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { actor: { select: { name: true } } },
  });

  return (
    <main className="container-page" style={{ maxWidth: 840 }}>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Audit Log</h1>
          <p className="page-subtitle">FR-14 - every state change, reassignment, and override.</p>
        </div>
      </div>

      <div className="table-wrap">
        {logs.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon" aria-hidden="true">-</span>
            No activity recorded yet.
          </div>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: "6px 0" }}>
            {logs.map((log) => (
              <li
                key={log.id}
                className="card"
                style={{
                  padding: "12px 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                  borderColor: "var(--border-light)",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontWeight: 500,
                      color: "var(--text-primary)",
                      textTransform: "uppercase",
                      fontSize: 11,
                      letterSpacing: "0.04em",
                      marginBottom: 4,
                    }}
                  >
                    {log.action.replace("_", " ")}
                  </p>
                  <p className="mono-sm" style={{ lineHeight: 1.5 }}>
                    {log.actor?.name ?? "System"} · {log.entityType}
                    {log.entityId ? ` #${log.entityId.slice(0, 8)}` : ""}
                  </p>
                </div>
                <span className="mono-sm">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
