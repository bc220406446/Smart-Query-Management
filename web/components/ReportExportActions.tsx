"use client";
import { useState } from "react";

export default function ReportExportActions({ queryId }: { queryId?: string }) {
  const [open, setOpen] = useState(false);
  const suffix = queryId ? `?queryId=${encodeURIComponent(queryId)}` : "";
  return <><button type="button" className="btn btn-outline-brand" onClick={() => setOpen(true)}>{queryId ? "Export query" : "Export query report"}</button>{open && <div className="modal-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}><section className="modal card" role="dialog" aria-modal="true" aria-labelledby="export-title"><div className="modal-header"><h2 id="export-title" className="card-title">Export {queryId ? "query" : "query report"}</h2><button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)} aria-label="Close">×</button></div><p className="page-subtitle">Choose the report format.</p><div className="modal-actions"><a className="btn btn-secondary" href={`/api/export/pdf${suffix}`}>Export as PDF</a><a className="btn btn-primary" href={`/api/export${suffix}`}>Export as Excel</a></div></section></div>}</>;
}
