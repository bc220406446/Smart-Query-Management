import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/roles";
import { DeptBar, StatusPie, VolumeLine } from "@/components/AnalyticsCharts";

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  await requireRole([Role.ADMIN]);

  const [byStatus, byDept, recentQueries, total, open, resolved, escalated] = await Promise.all([
    prisma.query.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.query.groupBy({ by: ["departmentId"], _count: { _all: true } }),
    prisma.query.findMany({
      select: { createdAt: true, status: true },
      orderBy: { createdAt: "asc" },
      take: 200,
    }),
    prisma.query.count(),
    prisma.query.count({ where: { status: { in: ["SUBMITTED", "CLASSIFYING", "ROUTED", "IN_PROGRESS"] } } }),
    prisma.query.count({ where: { status: { in: ["RESOLVED", "CLOSED"] } } }),
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

  // Last 7 days of volume.
  const volume: Array<{ date: string; count: number }> = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const next = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
    volume.push({
      date: day.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      count: recentQueries.filter((q) => q.createdAt >= day && q.createdAt < next).length,
    });
  }

  const stats = [
    { label: "Total queries", value: total },
    { label: "Open", value: open },
    { label: "Resolved", value: resolved },
    { label: "Escalated", value: escalated },
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold text-white">Analytics Dashboard</h1>
      <p className="mt-1 text-sm text-slate-400">FR-10 — volume, routing, and resolution overview.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{s.label}</p>
            <p className="mt-1 text-3xl font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-sm font-semibold text-slate-300">Queries by status</h2>
          <div className="mt-4"><StatusPie data={statusData} /></div>
        </section>
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-sm font-semibold text-slate-300">Queries by department</h2>
          <div className="mt-4"><DeptBar data={deptData} /></div>
        </section>
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-300">Volume — last 7 days</h2>
          <div className="mt-4"><VolumeLine data={volume} /></div>
        </section>
      </div>
    </main>
  );
}