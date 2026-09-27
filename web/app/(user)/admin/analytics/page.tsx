import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/roles";
import { DeptBar, StatusPie, VolumeLine } from "@/components/AnalyticsCharts";

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  await requireRole([Role.ADMIN]);
  const [byStatus, byDepartment, recentQueries, total, resolved] = await Promise.all([
    prisma.query.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.query.groupBy({ by: ["departmentId"], _count: { _all: true } }),
    prisma.query.findMany({ select: { createdAt: true }, orderBy: { createdAt: "asc" }, take: 500 }),
    prisma.query.count(),
    prisma.query.count({ where: { status: "RESOLVED" } }),
  ]);
  const departments = await prisma.department.findMany({ select: { id: true, name: true } });
  const departmentNames = new Map(departments.map((department) => [department.id, department.name]));
  const statusData = byStatus.map((entry) => ({ name: entry.status, value: entry._count._all }));
  const departmentData = byDepartment.map((entry) => ({ name: departmentNames.get(entry.departmentId ?? "") ?? "Unassigned", count: entry._count._all }));
  const today = new Date();
  const volume = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (6 - index));
    const nextDay = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
    return { date: day.toLocaleDateString("en-US", { month: "short", day: "numeric" }), count: recentQueries.filter((query) => query.createdAt >= day && query.createdAt < nextDay).length };
  });
  const stats = [
    { label: "Submitted", value: total },
    { label: "Resolved", value: resolved },
    { label: "Open", value: total - resolved },
  ];
  return (
    <main className="container-page">
      <div className="page-header"><div className="page-header-left"><h1 className="page-title">Analytics</h1><p className="page-subtitle">Volume, department distribution, and query status insights.</p></div></div>
      <div className="stats-grid" style={{ marginTop: 8 }}>{stats.map((stat) => <div key={stat.label} className="stat-card"><p className="stat-label">{stat.label}</p><p className="stat-value">{stat.value}</p></div>)}</div>
      <div className="grid-2" style={{ marginTop: 28 }}>
        <section className="card"><div className="card-header"><span className="card-title">Queries by status</span></div><div style={{ padding: "4px 0 12px" }}><StatusPie data={statusData} /></div></section>
        <section className="card"><div className="card-header"><span className="card-title">Queries by department</span></div><div style={{ padding: "4px 0 12px" }}><DeptBar data={departmentData} /></div></section>
        <section className="card" style={{ gridColumn: "1 / -1" }}><div className="card-header"><span className="card-title">Volume · last 7 days</span></div><div style={{ padding: "4px 0 12px" }}><VolumeLine data={volume} /></div></section>
      </div>
    </main>
  );
}
