import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/roles";
import { STAFF_ROLES } from "@/lib/roles";
import { PriorityBadge, StatusBadge } from "@/components/QueryStatusBadge";

export const dynamic = "force-dynamic";

export default async function StaffInboxPage() {
  const user = await requireRole([...STAFF_ROLES]);

  const queries = await prisma.query.findMany({
    where: {
      OR: [{ assignedToId: user.id }, { status: "ESCALATED" }],
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      student: { select: { name: true } },
      department: { select: { name: true } },
    },
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold text-white">Inbox</h1>
      <p className="mt-1 text-sm text-slate-400">
        Queries routed to you, plus escalated ones awaiting attention.
      </p>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-800">
        {queries.length === 0 ? (
          <p className="bg-slate-900 p-8 text-center text-sm text-slate-500">
            No queries assigned to you right now.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Subject</th>
                <th className="px-4 py-3 font-medium">Student</th>
                <th className="px-4 py-3 font-medium">Department</th>
                <th className="px-4 py-3 font-medium">Priority</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-900/50">
              {queries.map((q) => (
                <tr key={q.id} className="transition hover:bg-slate-800/60">
                  <td className="px-4 py-3">
                    <Link
                      href={`/staff/queries/${q.id}`}
                      className="font-medium text-slate-100 hover:text-indigo-300"
                    >
                      {q.subject}
                      {q.aiDraftReply && (
                        <span className="ml-2 rounded bg-amber-950 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400">
                          AI draft
                        </span>
                      )}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{q.student?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-400">{q.department?.name ?? "—"}</td>
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