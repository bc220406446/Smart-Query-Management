import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/roles";
import { DeptBar, StatusPie, VolumeLine } from "@/components/AnalyticsCharts";

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  await requireRole([Role.ADMIN]);

  const [byStatus, byDept, recentQueries, total, open, resolved, escalated] =
    await Promise.all([
      prisma.query.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.query.groupBy({ by: ["departmentId"], _count: { _all: true } }),
      prisma.query.findMany({
        select: { createdAt: true, status: true },
        orderBy: { createdAt: "asc" },
        take: 200,
      }),
      prisma.query.count(),
      prisma.query.count({
        where: {
          status: { in: ["SUBMITTED", "CLASSIFYING", "ROUTED", "IN_PROGRESS"] },
        },
      }),
      prisma.query.count({
        where: { status: { in: ["RESOLVED", "CLOSED"] } },
      }),
      prisma.query.count({ where: { status: "ESCALATED" } }),
    ]);

  const departments = await prisma.department.findMany();
  const deptName = new Map(departments.map((d) => [d.id, d.name]));

  const statusData = byStatus.map((s) => ({
    name: s.status,
    value: s._count._all,
  }));
  const deptData = byDept.map((d) => ({
    name: deptName.get(d.departmentId ?? "") ?? "Unassigned",
    count: d._count._all,
  }));

  const volume: Array<{ date: string; count: number }> = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const next = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
    volume.push({
      date: day.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      count: recentQueries.filter(
        (q) => q.createdAt >= day && q.createdAt < next
      ).length,
    });
  }

  const stats = [
    { label: "Total queries", value: total },
    { label: "Open", value: open },
    { label: "Resolved", value: resolved },
    { label: "Escalated", value: escalated },
  ];

  return (
    <main className="container-page">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Analytics Dashboard</h1>
          <p className="page-subtitle">FR-10 — volume, routing, and resolution overview.</p>
        </div>
      </div>

      <div className="stats-grid" style={{ marginTop: 8 }}>
        {stats.map((s) => (
          <div key={s.label} className="stat-card">
            <p className="stat-label">{s.label}</p>
            <p className="stat-value">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ marginTop: 28 }}>
        <section className="card">
          <div className="card-header">
            <span className="card-title">Queries by status</span>
          </div>
          <div style={{ padding: "4px 0 12px" }}>
            <StatusPie data={statusData} />
          </div>
        </section>
        <section className="card">
          <div className="card-header">
            <span className="card-title">Queries by department</span>
          </div>
          <div style={{ padding: "4px 0 12px" }}>
            <DeptBar data={deptData} />
          </div>
        </section>
        <section className="card" style={{ gridColumn: "1 / -1" }}>
          <div className="card-header">
            <span className="card-title">Volume — last 7 days</span>
          </div>
          <div style={{ padding: "4px 0 12px" }}>
            <VolumeLine data={volume} />
          </div>
        </section>
      </div>
    </main>
  );
}
