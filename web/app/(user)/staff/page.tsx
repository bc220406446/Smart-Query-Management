import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/roles";
import { PriorityBadge, StatusBadge } from "@/components/QueryStatusBadge";

export const dynamic = "force-dynamic";

export default async function StaffOverviewPage() {
  const user = await requireRole(["INSTRUCTOR"]);
  const [assigned, resolved, forwarded, recent] = await Promise.all([
    prisma.query.count({ where: { assignedToId: user.id } }),
    prisma.query.count({
      where: { assignedToId: user.id, status: "RESOLVED" },
    }),
    prisma.query.count({
      where: { assignedToId: user.id, status: "FORWARDED_TO_HOD" },
    }),
    prisma.query.findMany({
      where: { assignedToId: user.id },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { student: { select: { name: true } } },
    }),
  ]);

  return (
    <main className="container-page">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Staff Overview</h1>
          <p className="page-subtitle">
            Review and manage queries assigned to you.
          </p>
        </div>
      </div>
      <div className="stats-grid dashboard-stat-grid">
        <div className="stat-card">
          <p className="stat-label">Assigned</p>
          <p className="stat-value">{assigned}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Resolved</p>
          <p className="stat-value">{resolved}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Forwarded</p>
          <p className="stat-value">{forwarded}</p>
        </div>
      </div>
      <section className="dashboard-full-section">
        <h2 className="card-title" style={{ marginBottom: 16 }}>
          Recent assignments
        </h2>
        <div className="table-wrap">
          {recent.length === 0 ? (
            <div className="empty-state">
              No queries are assigned to you yet.
            </div>
          ) : (
            <table className="table table-stripe">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Student</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((q) => (
                  <tr key={q.id}>
                    <td>
                      <Link
                        href={`/staff/queries/${q.id}`}
                        className="table-link"
                      >
                        {q.subject}
                      </Link>
                    </td>
                    <td>{q.student?.name ?? "-"}</td>
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
      </section>
    </main>
  );
}
