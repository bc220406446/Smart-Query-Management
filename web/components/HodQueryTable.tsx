"use client";

import { useState } from "react";
import { escalateQuery } from "@/app/(user)/hod/actions";
import { PriorityBadge, StatusBadge } from "@/components/QueryStatusBadge";

type Row = { id: string; subject: string; student: string; assignedTo: string; priority: "LOW" | "NORMAL" | "HIGH" | "URGENT"; status: "SUBMITTED" | "ASSIGNED" | "IN_PROGRESS" | "RESOLVED" | "FORWARDED_TO_HOD" | "AUTO_ESCALATED" | "HOD_ESCALATED" | "FORWARDED_TO_STAFF"; message: string; createdAt: string };

export default function HodQueryTable({ queries }: { queries: Row[] }) {
  const [selected, setSelected] = useState<Row | null>(null);
  if (!queries.length) return <div className="table-wrap"><div className="empty-state">No open queries.</div></div>;
  return <>
    <div className="table-wrap"><table className="table table-stripe"><thead><tr><th>Subject</th><th>Student</th><th>Assigned to</th><th>Priority</th><th>Status</th><th>Escalate</th></tr></thead><tbody>{queries.map((q) => <tr key={q.id}><td><button type="button" className="table-link table-link-button" onClick={() => setSelected(q)}>{q.subject}</button></td><td>{q.student}</td><td>{q.assignedTo}</td><td><PriorityBadge priority={q.priority} /></td><td><StatusBadge status={q.status} /></td><td><button type="button" className="btn btn-secondary btn-sm" onClick={() => setSelected(q)}>Escalate</button></td></tr>)}</tbody></table></div>
    {selected && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setSelected(null)}><section className="modal card" role="dialog" aria-modal="true" aria-labelledby="hod-query-title"><div className="modal-header"><div><h2 id="hod-query-title" className="card-title">{selected.subject}</h2><p className="caption">{selected.student} · {selected.assignedTo}</p></div><button type="button" className="btn btn-ghost btn-sm" aria-label="Close query details" onClick={() => setSelected(null)}>×</button></div><p className="announcement-detail">{selected.message}</p><div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={() => setSelected(null)}>Cancel</button><form action={escalateQuery.bind(null, selected.id)}><button type="submit" className="btn btn-primary">Escalate to HOD inbox</button></form></div></section></div>}
  </>;
}
