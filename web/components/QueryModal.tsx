"use client";

import { useState } from "react";
import { submitQuery } from "@/app/(user)/dashboard/queries/new/actions";

export default function QueryModal() {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>+ New query</button>
    {open && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}><section className="modal card" role="dialog" aria-modal="true" aria-labelledby="new-query-title"><div className="modal-header"><div><h2 id="new-query-title" className="card-title">Submit a query</h2><p className="page-subtitle">We’ll route it to the right department.</p></div><button type="button" className="btn btn-ghost btn-sm" aria-label="Close dialog" onClick={() => setOpen(false)}>×</button></div><form action={submitQuery}><div className="field"><label htmlFor="modal-subject" className="field-label">Subject</label><input id="modal-subject" name="subject" className="field-input" required minLength={5} maxLength={200} placeholder="e.g. How do I register for CS302?" /></div><div className="field"><label htmlFor="modal-message" className="field-label">Details</label><textarea id="modal-message" name="message" className="field-textarea" required minLength={20} maxLength={5000} rows={7} placeholder="Describe your query in detail." /></div><div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Cancel</button><button type="submit" className="btn btn-primary">Submit query</button></div></form></section></div>}
  </>;
}
