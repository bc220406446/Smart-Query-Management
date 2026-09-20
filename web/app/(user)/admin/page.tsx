import Link from "next/link";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/roles";

export const dynamic = "force-dynamic";

function label(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default async function AdminOverviewPage() {
  await requireRole([Role.ADMIN]);
  const [total, resolved, announcements, activities] = await Promise.all([
    prisma.query.count(),
    prisma.query.count({ where: { status: "RESOLVED" } }),
    prisma.announcement.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { actor: { select: { name: true } } },
    }),
  ]);
  const stats = [
    { label: "Submitted", value: total },
    { label: "Resolved", value: resolved },
    { label: "Open", value: total - resolved },
  ];

  return (
    <main className="container-page">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Admin Overview</h1>
          <p className="page-subtitle">A quick view of platform activity and recent administration work.</p>
        </div>
      </div>

      <div className="stats-grid admin-stats-grid">
        {stats.map((stat) => (
          <div key={stat.label} className="stat-card">
            <p className="stat-label">{stat.label}</p>
            <p className="stat-value">{stat.value}</p>
          </div>
        ))}
      </div>

      <section className="admin-overview-section">
        <div className="section-heading-row">
          <h2 className="card-title">Recent announcements</h2>
          <Link href="/admin/announcements" className="btn btn-ghost btn-sm">View all</Link>
        </div>
        <div className="table-wrap">
          {announcements.length === 0 ? (
            <div className="empty-state">No announcements published yet.</div>
          ) : (
            <table className="table table-stripe">
              <thead><tr><th>Subject</th><th>Posted date</th></tr></thead>
              <tbody>
                {announcements.map((announcement) => (
                  <tr key={announcement.id}>
                    <td>{announcement.title}</td>
                    <td className="mono-sm">{new Date(announcement.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="admin-overview-section">
        <div className="section-heading-row">
          <h2 className="card-title">Recent activities</h2>
          <Link href="/admin/audit" className="btn btn-ghost btn-sm">View all</Link>
        </div>
        <div className="table-wrap">
          {activities.length === 0 ? (
            <div className="empty-state">No recent activity recorded.</div>
          ) : (
            <table className="table table-stripe">
              <thead><tr><th>Action</th><th>Actor</th><th>Entity</th><th>Time</th></tr></thead>
              <tbody>
                {activities.map((activity) => (
                  <tr key={activity.id}>
                    <td><span className="badge badge-subtle">{label(activity.action)}</span></td>
                    <td>{activity.actor?.name ?? "System"}</td>
                    <td>{label(activity.entityType)}</td>
                    <td className="mono-sm">{new Date(activity.createdAt).toLocaleString()}</td>
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
