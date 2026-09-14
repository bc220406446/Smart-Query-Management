import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/roles";
import { STAFF_ROLES } from "@/lib/roles";
import { PriorityBadge, StatusBadge } from "@/components/QueryStatusBadge";

export const dynamic = "force-dynamic";

export default async function StaffInboxPage() {
  const user = await requireRole([...STAFF_ROLES]);

  const queries = await prisma.query.findMany({
    where: {
      OR: [{ assignedToId: user.id }, { status: "ESCALATED" }],
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      student: { select: { name: true } },
      department: { select: { name: true } },
    },
  });

  return (
    <main className="container-page">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Inbox</h1>
          <p className="page-subtitle">
            Queries routed to you, plus escalated ones awaiting attention.
          </p>
        </div>
      </div>

      <div className="table-wrap">
        {queries.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon" aria-hidden="true">-</span>
            No queries assigned to you right now.
          </div>
        ) : (
          <table className="table table-stripe">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Student</th>
                <th>Department</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {queries.map((q) => (
                <tr key={q.id}>
                  <td>
                    <Link
                      href={`/staff/queries/${q.id}`}
                      className="table-link"
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      {q.subject}
                      {q.aiDraftReply && (
                        <span
                          className="badge badge-warning"
                          style={{ fontSize: 10, padding: "2px 7px" }}
                        >
                          AI draft
                        </span>
                      )}
                    </Link>
                  </td>
                  <td style={{ color: "var(--text-secondary)" }}>
                    {q.student?.name ?? "-"}
                  </td>
                  <td style={{ color: "var(--text-secondary)" }}>
                    {q.department?.name ?? "-"}
                  </td>
                  <td>
                    <PriorityBadge priority={q.priority} />
                  </td>
                  <td>
                    <StatusBadge status={q.status} />
                  </td>
                  <td className="mono-sm">
                    {new Date(q.createdAt).toLocaleDateString()}
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
