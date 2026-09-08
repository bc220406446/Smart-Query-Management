import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/roles";
import { PriorityBadge, StatusBadge } from "@/components/QueryStatusBadge";
import QueryStatusPoller from "@/components/QueryStatusPoller";

export const dynamic = "force-dynamic";

export default async function QueryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ submitted?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { submitted } = await searchParams;

  const query = await prisma.query.findFirst({
    where: { id, studentId: user.id },
    include: {
      replies: { orderBy: { createdAt: "asc" }, include: { author: { select: { name: true } } } },
      assignedTo: { select: { name: true } },
      department: { select: { name: true } },
    },
  });

  if (!query) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <p className="font-mono text-xs text-slate-500">Ticket #{query.ticketNumber.slice(0, 8)}</p>
      <div className="mt-1 flex items-center gap-3">
        <h1 className="text-2xl font-bold text-white">{query.subject}</h1>
        <StatusBadge status={query.status} />
        <PriorityBadge priority={query.priority} />
      </div>

      <div className="mt-1 flex items-center gap-4 text-xs text-slate-500">
        <span>Submitted {new Date(query.createdAt).toLocaleString()}</span>
        <span>Routed to {query.assignedTo?.name ?? "—"} ({query.department?.name ?? "unassigned"})</span>
      </div>

      {submitted === "1" && (
        <p className="mt-3 rounded-lg border border-emerald-800 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300">
          Query submitted! It has been queued for AI classification and routing.
        </p>
      )}

      <QueryStatusPoller queryId={query.id} currentStatus={query.status} />

      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Your message</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-200">{query.message}</p>
      </div>

      <h2 className="mt-8 text-sm font-semibold text-slate-300">Conversation &amp; updates</h2>
      <div className="mt-3 space-y-3">
        {query.replies.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-800 p-5 text-center text-sm text-slate-500">
            No replies yet. Your query is being handled — you&apos;ll be notified when there&apos;s an update.
          </p>
        )}
        {query.replies.map((r) => (
          <div
            key={r.id}
            className={`rounded-xl border p-4 ${
              r.isAiDraft
                ? "border-amber-800 bg-amber-950/20"
                : "border-slate-800 bg-slate-900"
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-medium text-slate-300">
                {r.isAiDraft ? "AI draft (pending staff review)" : r.author?.name ?? "Staff"}
              </span>
              <span>{new Date(r.createdAt).toLocaleString()}</span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-200">{r.body}</p>
          </div>
        ))}
      </div>
    </main>
  );
}