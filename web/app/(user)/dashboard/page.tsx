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

  const [myQueries, announcements, openCount, resolvedCount] = await Promise.all([
    prisma.query.findMany({
      where: isStaff ? { assignedToId: user.id } : { studentId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { assignedTo: { select: { name: true } }, department: { select: { name: true } } },
    }),
    prisma.announcement.findMany({ orderBy: { createdAt: "desc" }, take: 3 }),
    prisma.query.count({
      where: isStaff
        ? { assignedToId: user.id, status: { in: ["SUBMITTED", "CLASSIFYING", "ROUTED", "IN_PROGRESS"] } }
        : { studentId: user.id, status: { in: ["SUBMITTED", "CLASSIFYING", "ROUTED", "IN_PROGRESS", "ESCALATED"] } },
    }),
    prisma.query.count({
      where: isStaff
        ? { assignedToId: user.id, status: { in: ["RESOLVED", "CLOSED"] } }
        : { studentId: user.id, status: { in: ["RESOLVED", "CLOSED"] } },
    }),
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
        {!isStaff && (
          <Link
            href="/dashboard/queries/new"
            className="btn btn-primary"
          >
            + New Query
          </Link>
        )}
      </div>

      <div className="stats-grid dashboard-stat-grid">
        {statCards(isStaff ? "Assigned open" : "Open queries", openCount)}
        {statCards(isStaff ? "Assigned resolved" : "Resolved", resolvedCount)}
        {statCards("Announcements", announcements.length)}
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

        <section className="dashboard-full-section">
          <h3 style={{ marginBottom: 16 }}>Announcements</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {announcements.length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: "24px 16px", color: "var(--text-tertiary)", fontSize: 13 }}>
                No announcements yet.
              </div>
            ) : (
              announcements.map((a) => (
                <div key={a.id} className="card" style={{ padding: "14px 16px" }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>{a.title}</p>
                  <p className="line-clamp-2" style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>{a.body}</p>
                  <p style={{ marginTop: 8, fontSize: 11, color: "var(--text-tertiary)" }}>
                    {new Date(a.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}


