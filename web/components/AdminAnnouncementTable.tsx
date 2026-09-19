"use client";
import { useState } from "react";
import {
  createAnnouncement,
  deleteAnnouncement,
  updateAnnouncement,
} from "@/app/(user)/admin/announcements/actions";
type Announcement = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
};
export default function AdminAnnouncementTable({
  announcements,
}: {
  announcements: Announcement[];
}) {
  const [item, setItem] = useState<Announcement | null>(null);
  const [creating, setCreating] = useState(false);
  const current = item ?? { id: "", title: "", body: "", createdAt: "" };
  const close = () => {
    setItem(null);
    setCreating(false);
  };
  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Announcements</h1>
          <p className="page-subtitle">
            Broadcast updates to every student dashboard.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setCreating(true)}
        >
          New announcement
        </button>
      </div>
      {announcements.length === 0 ? (
        <div className="table-wrap">
          <div className="empty-state">No announcements yet.</div>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table table-stripe">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Posted date</th>
                <th style={{ textAlign: "left" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {announcements.map((a) => (
                <tr key={a.id}>
                  <td>{a.title}</td>
                  <td className="mono-sm">
                    {new Date(a.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "flex-start",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setItem(a)}
                      >
                        Edit
                      </button>
                      <form action={deleteAnnouncement}>
                        <input type="hidden" name="id" value={a.id} />
                        <button type="submit" className="btn btn-danger btn-sm">
                          Delete
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {(item || creating) && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => e.target === e.currentTarget && close()}
        >
          <section
            className="modal card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="announcement-form-title"
          >
            <div className="modal-header">
              <h2 id="announcement-form-title" className="card-title">
                {item ? "Edit announcement" : "New announcement"}
              </h2>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={close}
              >
                ×
              </button>
            </div>
            <form action={item ? updateAnnouncement : createAnnouncement}>
              <input type="hidden" name="id" value={current.id} />
              <div className="field">
                <label className="field-label" htmlFor="announcement-title">
                  Subject
                </label>
                <input
                  id="announcement-title"
                  name="title"
                  className="field-input"
                  required
                  minLength={3}
                  maxLength={150}
                  defaultValue={current.title}
                />
              </div>
              <div className="field">
                <label className="field-label" htmlFor="announcement-body">
                  Message
                </label>
                <textarea
                  id="announcement-body"
                  name="body"
                  className="field-textarea"
                  rows={6}
                  required
                  minLength={10}
                  defaultValue={current.body}
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={close}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {item ? "Save changes" : "Publish announcement"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
