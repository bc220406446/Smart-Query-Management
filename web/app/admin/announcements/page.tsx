import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/roles";
import { createAnnouncement } from "./actions";

export const dynamic = "force-dynamic";

export default async function AnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireRole([Role.ADMIN]);
  const { error } = await searchParams;
  const announcements = await prisma.announcement.findMany({
    orderBy: { createdAt: "desc" },
    include: { author: { select: { name: true } } },
  });

  return (
    <main className="container-page" style={{ maxWidth: 720 }}>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Announcements</h1>
          <p className="page-subtitle">FR-11 — broadcast a message to every student dashboard.</p>
        </div>
      </div>

      {error && (
        <div className="error-box" style={{ marginBottom: 20 }}>
          {error}
        </div>
      )}

      <form
        action={createAnnouncement}
        className="card"
        style={{ marginTop: 8, padding: "20px 24px" }}
      >
        <h3
          style={{
            fontSize: 14,
            fontWeight: 600,
            marginBottom: 16,
          }}
        >
          New announcement
        </h3>
        <div className="field" style={{ marginBottom: 16 }}>
          <label htmlFor="title" className="field-label">
            Title
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            minLength={3}
            maxLength={150}
            className="field-input"
            placeholder="e.g. Midterm exam schedule released"
          />
        </div>
        <div className="field" style={{ marginBottom: 20 }}>
          <label htmlFor="body" className="field-label">
            Message
          </label>
          <textarea
            id="body"
            name="body"
            required
            minLength={10}
            rows={6}
            className="field-textarea"
            placeholder="Details students need to know…"
          />
        </div>
        <button type="submit" className="btn btn-primary btn-lg">
          Publish announcement
        </button>
      </form>

      <h3
        style={{
          fontSize: 14,
          fontWeight: 600,
          marginTop: 28,
          marginBottom: 12,
        }}
      >
        Previously published
      </h3>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {announcements.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "28px 16px" }}>
            <p style={{ color: "var(--text-tertiary)", fontSize: 13 }}>
              Nothing published yet.
            </p>
          </div>
        ) : (
          announcements.map((a) => (
            <div key={a.id} className="card">
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 12,
                  marginBottom: 8,
                }}
              >
                <p style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                  {a.title}
                </p>
                <span className="mono-sm">
                  {new Date(a.createdAt).toLocaleString()}
                </span>
              </div>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text-secondary)",
                  lineHeight: 1.6,
                  margin: "0 0 10px",
                }}
              >
                {a.body}
              </p>
              <p className="mono-sm" style={{ margin: 0 }}>
                by {a.author.name ?? "Admin"}
              </p>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
