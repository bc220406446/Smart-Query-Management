import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/roles";
import { PriorityBadge, StatusBadge } from "@/components/QueryStatusBadge";

export const dynamic = "force-dynamic";

export default async function MyQueriesPage() {
  const user = await requireUser();
  const queries = await prisma.query.findMany({
    where: { studentId: user.id },
    orderBy: { createdAt: "desc" },
    include: { assignedTo: { select: { name: true } } },
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">My Queries</h1>
        <Link
          href="/dashboard/queries/new"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
        >
          + New Query
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-800">
        {queries.length === 0 ? (
          <p className="bg-slate-900 p-8 text-center text-sm text-slate-500">
            You haven&apos;t submitted any queries yet.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Ticket</th>
                <th className="px-4 py-3 font-medium">Subject</th>
                <th className="px-4 py-3 font-medium">Assigned to</th>
                <th className="px-4 py-3 font-medium">Priority</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-900/50">
              {queries.map((q) => (
                <tr key={q.id} className="transition hover:bg-slate-800/60">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">#{q.ticketNumber.slice(0, 8)}</td>
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/queries/${q.id}`} className="font-medium text-slate-100 hover:text-indigo-300">
                      {q.subject}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{q.assignedTo?.name ?? "—"}</td>
                  <td className="px-4 py-3"><PriorityBadge priority={q.priority} /></td>
                  <td className="px-4 py-3"><StatusBadge status={q.status} /></td>
                  <td className="px-4 py-3 text-xs text-slate-500">{new Date(q.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}