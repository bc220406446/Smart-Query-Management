import Link from "next/link";
import { QueryStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/roles";
import { StatusBadge } from "@/components/QueryStatusBadge";
import { VolumeLine } from "@/components/AnalyticsCharts";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const statCards = (label: string, value: number) => (
  <div className="stat-card">
    <p className="stat-label">{label}</p>
    <p className="stat-value">{value}</p>
  </div>
);

export default async function DashboardPage() {
  const user = await requireUser();
  if (user.role === "HOD") redirect("/hod");
  if (user.role === "ADMIN") redirect("/admin");
  if (user.role === "INSTRUCTOR") redirect("/staff");
  const isStaff = ["INSTRUCTOR", "HOD", "ADMIN"].includes(user.role);
  const profile = isStaff ? await prisma.user.findUnique({ where: { id: user.id }, select: { departmentId: true } }) : null;
  const hodOpenStatuses = [QueryStatus.SUBMITTED, QueryStatus.ASSIGNED, QueryStatus.IN_PROGRESS, QueryStatus.FORWARDED_TO_HOD, QueryStatus.AUTO_ESCALATED, QueryStatus.HOD_ESCALATED, QueryStatus.FORWARDED_TO_STAFF];
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [myQueries, resolvedCount, forwardedCount, inProgressCount, assignedCount, departmentAssignedCount, departmentResolvedCount, departmentOpenCount, adminTotalCount, adminResolvedCount, adminOpenCount, adminVolumeQueries, studentAssignedCount, studentOpenCount] = await Promise.all([
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
    prisma.query.count({ where: { assignedToId: user.id } }),
    prisma.query.count({ where: profile?.departmentId ? { departmentId: profile.departmentId } : { id: "__no_department__" } }),
    prisma.query.count({ where: profile?.departmentId ? { departmentId: profile.departmentId, status: "RESOLVED" } : { id: "__no_department__" } }),
    prisma.query.count({ where: profile?.departmentId ? { departmentId: profile.departmentId, status: { in: hodOpenStatuses } } : { id: "__no_department__" } }),
    prisma.query.count(),
    prisma.query.count({ where: { status: "RESOLVED" } }),
    prisma.query.count({ where: { status: { not: "RESOLVED" } } }),
    prisma.query.findMany({ where: { createdAt: { gte: sevenDaysAgo } }, select: { createdAt: true } }),
    prisma.query.count({ where: { studentId: user.id, status: "ASSIGNED" } }),
    prisma.query.count({ where: { studentId: user.id, status: { not: "RESOLVED" } } }),
  ]);

  const volume: Array<{ date: string; count: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date(); day.setHours(0, 0, 0, 0); day.setDate(day.getDate() - i);
    const next = new Date(day); next.setDate(next.getDate() + 1);
    volume.push({ date: day.toLocaleDateString("en-US", { month: "short", day: "numeric" }), count: adminVolumeQueries.filter((query) => query.createdAt >= day && query.createdAt < next).length });
  }

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
        {statCards(isStaff ? "Total assigned" : "Assigned", isStaff ? assignedCount : studentAssignedCount)}
        {statCards(isStaff ? "Total resolved" : "Resolved", isStaff ? resolvedCount : resolvedCount)}
        {statCards(isStaff ? "Total forwarded" : "Open", isStaff ? forwardedCount : studentOpenCount)}
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
