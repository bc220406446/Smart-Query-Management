import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/roles";
import { PriorityBadge, StatusBadge } from "@/components/QueryStatusBadge";
import ReportExportActions from "@/components/ReportExportActions";
export const dynamic = "force-dynamic";
export default async function AdminQueriesPage() {
  await requireRole(["ADMIN"]);
  const queries = await prisma.query.findMany({ orderBy: { createdAt: "desc" }, include: { student: { select: { name: true } }, department: { select: { name: true } } } });
  return <main className="container-page"><div className="page-header"><div className="page-header-left"><h1 className="page-title">All Queries</h1><p className="page-subtitle">Complete query register across all departments.</p></div><ReportExportActions /></div><div className="table-wrap"><table className="table table-stripe"><thead><tr><th>Subject</th><th>Student</th><th>Department</th><th>Priority</th><th>Status</th><th>Submitted</th></tr></thead><tbody>{queries.map((q) => <tr key={q.id}><td><Link href={`/staff/queries/${q.id}`} className="table-link">{q.subject}</Link></td><td>{q.student?.name ?? "-"}</td><td>{q.department?.name ?? "-"}</td><td><PriorityBadge priority={q.priority} /></td><td><StatusBadge status={q.status} /></td><td className="mono-sm">{new Date(q.createdAt).toLocaleDateString()}</td></tr>)}</tbody></table></div></main>;
}
