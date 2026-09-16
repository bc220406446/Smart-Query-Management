import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/roles";
import { StatusBadge } from "@/components/QueryStatusBadge";

export const dynamic = "force-dynamic";

const statCards = (label: string, value: number) => (
  <div className="stat-card">
    <p className="stat-label">{label}</p>
    <p className="stat-value">{value}</p>
  </div>
);

export default async function DashboardPage() {
  const user = await requireUser();
  const isStaff = ["INSTRUCTOR", "HOD", "ADMIN"].includes(user.role);

  const [myQueries, resolvedCount, forwardedCount, inProgressCount] = await Promise.all([
    prisma.query.findMany({
      where: isStaff ? { assignedToId: user.id } : { studentId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { assignedTo: { select: { name: true } }, department: { select: { name: true } } },
    }),
    prisma.query.count({
      where: isStaff
        ? { assignedToId: user.id, status: "RESOLVED" }
        : { studentId: user.id, status: "RESOLVED" },
    }),
    prisma.query.count({ where: isStaff ? { assignedToId: user.id, status: "FORWARDED_TO_HOD" } : { studentId: user.id, status: "FORWARDED_TO_HOD" } }),
    prisma.query.count({ where: isStaff ? { assignedToId: user.id, status: "IN_PROGRESS" } : { studentId: user.id, status: "IN_PROGRESS" } }),
  ]);

  return (
    <main className="container-page">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">
            Welcome, {user.name?.split(" ")[0] ?? "there"}
          </h1>
          <p className="page-subtitle">
            {isStaff
              ? "Your assigned queries and announcements."
              : "Track your queries and their resolution status."}
          </p>
        </div>
      </div>

      <div className="stats-grid dashboard-stat-grid">
        {statCards("Total resolved", resolvedCount)}
        {statCards("Total forwarded", forwardedCount)}
        {statCards("Total in progress", inProgressCount)}
      </div>

      <div className="dashboard-sections">
        <section className="dashboard-full-section">
          <h3 style={{ marginBottom: 16 }}>
            {isStaff ? "Recently assigned" : "Recent queries"}
          </h3>
          <div className="table-wrap" style={{ padding: 0 }}>
            {myQueries.length === 0 ? (
              <div className="empty-state">
                <span className="empty-state-icon" aria-hidden="true">-</span>
                Nothing here yet. {isStaff ? "Queries routed to you will appear here." : "Submit a query to get started."}
              </div>
            ) : (
              <table className="table table-stripe dashboard-recent-table">
                <thead><tr><th>Subject</th><th>Submitted date</th><th>Time</th><th>Assigned to</th><th>Status</th></tr></thead>
                <tbody>
                  {myQueries.map((q) => {
                    const submitted = new Date(q.createdAt);
                    return (
                      <tr key={q.id}>
                        <td><Link href={isStaff ? `/staff/queries/${q.id}` : `/dashboard/queries/${q.id}`} className="table-link">{q.subject}</Link></td>
                        <td>{submitted.toLocaleDateString()}</td>
                        <td>{submitted.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</td>
                        <td>{q.assignedTo?.name ?? "Unassigned"}</td>
                        <td><StatusBadge status={q.status} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>

      </div>
    </main>
  );
}
