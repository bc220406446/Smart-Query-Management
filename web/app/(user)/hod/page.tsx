import { QueryStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/roles";
import { VolumeLine } from "@/components/AnalyticsCharts";

export const dynamic = "force-dynamic";

export default async function HodOverviewPage() {
  const user = await requireRole([Role.HOD]);
  const profile = await prisma.user.findUnique({ where: { id: user.id }, select: { departmentId: true } });
  const departmentId = profile?.departmentId;
  const openStatuses: QueryStatus[] = [QueryStatus.SUBMITTED, QueryStatus.ASSIGNED, QueryStatus.IN_PROGRESS, QueryStatus.FORWARDED_TO_HOD, QueryStatus.AUTO_ESCALATED, QueryStatus.HOD_ESCALATED, QueryStatus.FORWARDED_TO_STAFF];
  const from = new Date(); from.setDate(from.getDate() - 7);
  const [assigned, resolved, open, recent] = await Promise.all([
    prisma.query.count({ where: departmentId ? { departmentId } : { id: "__none__" } }),
    prisma.query.count({ where: departmentId ? { departmentId, status: "RESOLVED" } : { id: "__none__" } }),
    prisma.query.count({ where: departmentId ? { departmentId, status: { in: openStatuses } } : { id: "__none__" } }),
    prisma.query.findMany({ where: departmentId ? { departmentId, createdAt: { gte: from } } : { id: "__none__" }, select: { createdAt: true } }),
  ]);
  const volume = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(); day.setHours(0, 0, 0, 0); day.setDate(day.getDate() - (6 - index));
    const next = new Date(day); next.setDate(next.getDate() + 1);
    return { date: day.toLocaleDateString("en-US", { month: "short", day: "numeric" }), count: recent.filter((q) => q.createdAt >= day && q.createdAt < next).length };
  });
  return <main className="container-page"><div className="page-header"><div className="page-header-left"><h1 className="page-title">HOD Overview</h1><p className="page-subtitle">Monitor your department&apos;s query workload and resolution progress.</p></div></div><div className="stats-grid dashboard-stat-grid"><div className="stat-card"><p className="stat-label">Assigned</p><p className="stat-value">{assigned}</p></div><div className="stat-card"><p className="stat-label">Resolved</p><p className="stat-value">{resolved}</p></div><div className="stat-card"><p className="stat-label">Open</p><p className="stat-value">{open}</p></div></div><section className="card dashboard-volume-card"><div className="card-header"><span className="card-title">Department query volume · last 7 days</span></div><VolumeLine data={volume} /></section></main>;
}
