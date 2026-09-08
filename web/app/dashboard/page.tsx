import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/roles";
import { StatusBadge } from "@/components/QueryStatusBadge";

export const dynamic = "force-dynamic";

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-bold text-white">{value}</p>
    </div>
  );
}

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
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Welcome, {user.name?.split(" ")[0] ?? "there"} 👋
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {isStaff ? "Your assigned queries and announcements." : "Track your queries and their resolution status."}
          </p>
        </div>
        {!isStaff && (
          <Link
            href="/dashboard/queries/new"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
          >
            + New Query
          </Link>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label={isStaff ? "Assigned open" : "Open queries"} value={openCount} />
        <StatCard label={isStaff ? "Assigned resolved" : "Resolved"} value={resolvedCount} />
        <StatCard label="Announcements" value={announcements.length} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-300">
            {isStaff ? "Recently assigned" : "Recent queries"}
          </h2>
          <div className="mt-3 overflow-hidden rounded-xl border border-slate-800">
            {myQueries.length === 0 ? (
              <p className="bg-slate-900 p-6 text-sm text-slate-500">
                Nothing here yet. {isStaff ? "Queries routed to you will appear here." : "Submit a query to get started."}
              </p>
            ) : (
              <ul className="divide-y divide-slate-800">
                {myQueries.map((q) => (
                  <li key={q.id}>
                    <Link
                      href={isStaff ? `/staff/queries/${q.id}` : `/dashboard/queries/${q.id}`}
                      className="flex items-center justify-between gap-4 bg-slate-900 px-4 py-3 transition hover:bg-slate-800/60"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-100">{q.subject}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(q.createdAt).toLocaleString()}
                          {q.assignedTo?.name ? ` · ${q.assignedTo.name}` : ""}
                          {q.department?.name ? ` · ${q.department.name}` : ""}
                        </p>
                      </div>
                      <StatusBadge status={q.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-slate-300">Announcements</h2>
          <div className="mt-3 space-y-3">
            {announcements.length === 0 && (
              <p className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-500">
                No announcements yet.
              </p>
            )}
            {announcements.map((a) => (
              <div key={a.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-sm font-semibold text-slate-100">{a.title}</p>
                <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-slate-400">{a.body}</p>
                <p className="mt-2 text-[11px] text-slate-600">{new Date(a.createdAt).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}