import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/roles";
import HodQueryTable from "@/components/HodQueryTable";

export const dynamic = "force-dynamic";

export default async function HodConsolePage() {
  const user = await requireRole([Role.HOD, Role.ADMIN]);
  // The console is only for queries that can still be manually escalated.
  // Already escalated queries belong in the HOD inbox, not this list.
  const openStatuses = ["SUBMITTED", "ASSIGNED", "IN_PROGRESS"] as const;
  const queries = await prisma.query.findMany({
    where: user.role === Role.ADMIN ? { status: { in: [...openStatuses] } } : { status: { in: [...openStatuses] }, assignedTo: { hodId: user.id } },
    orderBy: { createdAt: "asc" },
    take: 50,
    include: { student: { select: { name: true } }, assignedTo: { select: { name: true } } },
  });
  return <main className="container-page"><div className="page-header"><div className="page-header-left"><h1 className="page-title">HOD Console</h1><p className="page-subtitle">Review open department queries and escalate them to the HOD inbox when needed.</p></div></div><section style={{ marginTop: 28 }}><HodQueryTable queries={queries.map((q) => ({ id: q.id, subject: q.subject, student: q.student?.name ?? "Anonymous", assignedTo: q.assignedTo?.name ?? "Unassigned", priority: q.priority, status: q.status, message: q.message, createdAt: q.createdAt.toISOString() }))} /></section></main>;
}
