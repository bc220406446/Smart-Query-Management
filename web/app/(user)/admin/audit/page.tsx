import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/roles";
export const dynamic = "force-dynamic";
function label(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
export default async function AuditLogPage() {
  await requireRole([Role.ADMIN]);
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { actor: { select: { name: true, email: true } } },
  });
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayCount = logs.filter(
    (log) => new Date(log.createdAt) >= today,
  ).length;
  const actors = new Set(logs.map((log) => log.actorId).filter(Boolean)).size;
  return (
    <main className="container-page">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Audit Log</h1>
          <p className="page-subtitle">
            A traceable record of state changes, assignments, overrides, and
            administrative actions.
          </p>
        </div>
      </div>
      <div className="table-wrap" style={{ marginTop: 28 }}>
        {logs.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon" aria-hidden="true">
              -
            </span>
            No activity recorded yet.
          </div>
        ) : (
          <table className="table table-stripe">
            <thead>
              <tr>
                <th>Action</th>
                <th>Actor</th>
                <th>Entity</th>
                <th>Reference</th>
                <th>Timestamp</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>
                    <span className="badge badge-subtle">
                      {label(log.action)}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>
                      {log.actor?.name ?? "System"}
                    </div>
                    {log.actor?.email && (
                      <div className="caption">{log.actor.email}</div>
                    )}
                  </td>
                  <td>{label(log.entityType)}</td>
                  <td className="mono-sm">
                    {log.entityId ? `#${log.entityId.slice(0, 8)}` : "-"}
                  </td>
                  <td className="mono-sm">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td>
                    <details>
                      <summary
                        className="table-link"
                        style={{ cursor: "pointer" }}
                      >
                        View
                      </summary>
                      <pre
                        style={{
                          maxWidth: 280,
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                          color: "var(--text-secondary)",
                          fontSize: 11,
                          marginTop: 8,
                        }}
                      >
                        {JSON.stringify(log.metadata ?? {}, null, 2)}
                      </pre>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
