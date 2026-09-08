import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/roles";
import { STAFF_ROLES } from "@/lib/roles";
import { PriorityBadge, StatusBadge } from "@/components/QueryStatusBadge";
import { sendReply, approveAiDraft } from "./actions";

export const dynamic = "force-dynamic";

export default async function StaffQueryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireRole([...STAFF_ROLES]);
  const { id } = await params;
  const { error } = await searchParams;

  const query = await prisma.query.findFirst({
    where: { id, OR: [{ assignedToId: user.id }, { status: "ESCALATED" }] },
    include: {
      student: { select: { name: true, email: true } },
      replies: { orderBy: { createdAt: "asc" }, include: { author: { select: { name: true } } } },
      department: { select: { name: true } },
    },
  });

  if (!query) notFound();

  const resolved = query.status === "RESOLVED" || query.status === "CLOSED";

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <p className="font-mono text-xs text-slate-500">Ticket #{query.ticketNumber.slice(0, 8)}</p>
      <div className="mt-1 flex items-center gap-3">
        <h1 className="text-2xl font-bold text-white">{query.subject}</h1>
        <StatusBadge status={query.status} />
        <PriorityBadge priority={query.priority} />
      </div>

      <p className="mt-1 text-xs text-slate-500">
        From {query.student?.name ?? "Anonymous"} ({query.student?.email ?? "no email"}) · {query.department?.name ?? "Unassigned"} ·{" "}
        {query.channel} channel · submitted {new Date(query.createdAt).toLocaleString()}
      </p>

      {error && (
        <p className="mt-3 rounded-lg border border-rose-800 bg-rose-950/40 px-4 py-3 text-sm text-rose-300">
          {error}
        </p>
      )}

      {query.category && (
        <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-slate-800 px-2.5 py-0.5 text-[11px] font-semibold text-slate-300">
          {query.category} {query.confidence != null && `· ${(query.confidence * 100).toFixed(0)}% confidence`}
        </p>
      )}

      <div className="mt-5 rounded-xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Student message</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-200">{query.message}</p>
      </div>

      {query.aiDraftReply && !resolved && (
        <div className="mt-5 rounded-xl border border-amber-700/60 bg-amber-950/20 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-amber-400">
              ✨ AI-drafted reply (FR-05)
            </h2>
            <form action={approveAiDraft.bind(null, query.id)}>
              <button
                type="submit"
                className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-500"
              >
                Approve &amp; send
              </button>
            </form>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-amber-100/90">
            {query.aiDraftReply}
          </p>
        </div>
      )}

      <h2 className="mt-8 text-sm font-semibold text-slate-300">Replies</h2>
      <div className="mt-3 space-y-3">
        {query.replies.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-800 p-5 text-center text-sm text-slate-500">
            No replies yet.
          </p>
        )}
        {query.replies.map((r) => (
          <div key={r.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-medium text-slate-300">{r.author?.name ?? "System"}</span>
              <span>{new Date(r.createdAt).toLocaleString()}</span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-200">{r.body}</p>
          </div>
        ))}
      </div>

      {!resolved && (
        <form action={sendReply.bind(null, query.id)} className="mt-8">
          <label htmlFor="body" className="block text-sm font-medium text-slate-300">
            Write a reply
          </label>
          <textarea
            id="body"
            name="body"
            required
            minLength={1}
            rows={5}
            className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none"
            placeholder="Sending a reply marks the query as resolved."
          />
          <button
            type="submit"
            className="mt-3 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
          >
            Send reply
          </button>
        </form>
      )}
    </main>
  );
}