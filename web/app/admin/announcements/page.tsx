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
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-white">Announcements</h1>
      <p className="mt-1 text-sm text-slate-400">FR-11 — broadcast a message to every student dashboard.</p>

      {error && (
        <p className="mt-4 rounded-lg border border-rose-800 bg-rose-950/40 px-4 py-3 text-sm text-rose-300">
          {error}
        </p>
      )}

      <form action={createAnnouncement} className="mt-6 space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-5">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-slate-300">Title</label>
          <input
            id="title"
            name="title"
            type="text"
            required
            minLength={3}
            maxLength={150}
            className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none"
            placeholder="e.g. Midterm exam schedule released"
          />
        </div>
        <div>
          <label htmlFor="body" className="block text-sm font-medium text-slate-300">Message</label>
          <textarea
            id="body"
            name="body"
            required
            minLength={10}
            rows={5}
            className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none"
            placeholder="Details students need to know…"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
        >
          Publish announcement
        </button>
      </form>

      <h2 className="mt-10 text-sm font-semibold text-slate-300">Previously published</h2>
      <div className="mt-3 space-y-3">
        {announcements.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-800 p-6 text-center text-sm text-slate-500">
            Nothing published yet.
          </p>
        )}
        {announcements.map((a) => (
          <div key={a.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-100">{a.title}</p>
              <p className="text-xs text-slate-600">{new Date(a.createdAt).toLocaleString()}</p>
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{a.body}</p>
            <p className="mt-2 text-[11px] text-slate-600">by {a.author.name ?? "Admin"}</p>
          </div>
        ))}
      </div>
    </main>
  );
}