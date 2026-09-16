"use client";

import { useState } from "react";

type Announcement = { id: string; title: string; body: string; createdAt: string };

export default function AnnouncementTable({ announcements }: { announcements: Announcement[] }) {
  const [selected, setSelected] = useState<Announcement | null>(null);
  if (announcements.length === 0) return <div className="table-wrap"><div className="empty-state">No announcements yet.</div></div>;
  return <>
    <div className="table-wrap"><table className="table table-stripe"><thead><tr><th>Subject</th><th>Posted date</th></tr></thead><tbody>{announcements.map((announcement) => <tr key={announcement.id}><td><button type="button" className="table-link table-link-button" onClick={() => setSelected(announcement)}>{announcement.title}</button></td><td className="mono-sm">{new Date(announcement.createdAt).toLocaleDateString()}</td></tr>)}</tbody></table></div>
    {selected && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setSelected(null)}><section className="modal card" role="dialog" aria-modal="true" aria-labelledby="announcement-title"><div className="modal-header"><div><h2 id="announcement-title" className="card-title">{selected.title}</h2><p className="caption">Posted {new Date(selected.createdAt).toLocaleDateString()}</p></div><button type="button" className="btn btn-ghost btn-sm" aria-label="Close announcement" onClick={() => setSelected(null)}>×</button></div><p className="announcement-detail">{selected.body}</p></section></div>}
  </>;
}
