import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/roles";
import { PriorityBadge, StatusBadge } from "@/components/QueryStatusBadge";
import QueryModal from "@/components/QueryModal";
import { splitIncomingQuery } from "@/lib/query-submission";

export const dynamic = "force-dynamic";

export default async function MyQueriesPage() {
  const user = await requireUser();
  const queries = await prisma.query.findMany({
    where: { studentId: user.id },
    orderBy: { createdAt: "desc" },
    include: { assignedTo: { select: { name: true } } },
  });

  return (
    <main className="container-page">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">My Queries</h1>
          <p className="page-subtitle">
            Every query you have submitted, with current status and assignment.
          </p>
        </div>
        <QueryModal />
      </div>

      <div className="table-wrap">
        {queries.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon" aria-hidden="true">-</span>
            You haven&apos;t submitted any queries yet. Use “New query” to get started.
          </div>
        ) : (
          <table className="table table-stripe">
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Subject</th>
                <th>Assigned to</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {queries.map((q) => (
                (() => {
                  const display = splitIncomingQuery(undefined, q.message);
                  return <tr key={q.id}>
                  <td className="mono-sm">#{q.ticketNumber.slice(0, 8)}</td>
                  <td>
                    <Link
                      href={`/dashboard/queries/${q.id}`}
                      className="table-link"
                    >
                      {splitIncomingQuery(q.subject, q.message).subject}
                    </Link>
                  </td>
                  <td className="text-secondary">
                    {q.assignedTo?.name ?? "-"}
                  </td>
                  <td>
                    <PriorityBadge priority={q.priority} />
                  </td>
                  <td>
                    <StatusBadge status={q.status} />
                  </td>
                  <td className="mono-sm">
                    {new Date(q.createdAt).toLocaleDateString()}
                  </td>
                  </tr>;
                })()
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
