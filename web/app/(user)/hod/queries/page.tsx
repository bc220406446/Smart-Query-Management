import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/roles";
import { PriorityBadge, StatusBadge } from "@/components/QueryStatusBadge";
import ReportExportActions from "@/components/ReportExportActions";
export const dynamic = "force-dynamic";
export default async function HodDepartmentQueriesPage() {
  const user = await requireRole(["HOD"]);
  const profile = await prisma.user.findUnique({ where: { id: user.id }, select: { departmentId: true } });
  const queries = await prisma.query.findMany({ where: { departmentId: profile?.departmentId ?? undefined }, orderBy: { createdAt: "desc" }, include: { student: { select: { name: true } }, assignedTo: { select: { name: true } } } });
  return <main className="container-page"><div className="page-header"><div className="page-header-left"><h1 className="page-title">Department Queries</h1><p className="page-subtitle">All queries belonging to your department.</p></div><ReportExportActions /></div><div className="table-wrap"><table className="table table-stripe"><thead><tr><th>Subject</th><th>Student</th><th>Assigned to</th><th>Priority</th><th>Status</th><th>Submitted</th></tr></thead><tbody>{queries.map((q) => <tr key={q.id}><td><Link href={`/staff/queries/${q.id}?from=all-queries`} className="table-link">{q.subject}</Link></td><td>{q.student?.name ?? "-"}</td><td>{q.assignedTo?.name ?? "-"}</td><td><PriorityBadge priority={q.priority} /></td><td><StatusBadge status={q.status} /></td><td className="mono-sm">{new Date(q.createdAt).toLocaleDateString()}</td></tr>)}</tbody></table></div></main>;
}
