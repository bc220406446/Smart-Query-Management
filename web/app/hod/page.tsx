import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/roles";
import { StatusBadge } from "@/components/QueryStatusBadge";
import { overrideQuery } from "./actions";

export const dynamic = "force-dynamic";

const STATUS_OPTIONS = ["SUBMITTED", "CLASSIFYING", "ROUTED", "IN_PROGRESS", "RESOLVED", "ESCALATED", "CLOSED"];

export default async function HodConsolePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireRole([Role.HOD, Role.ADMIN]);
  const { error } = await searchParams;

  const [escalated, openQueries, assignees] = await Promise.all([
    prisma.query.findMany({
      where: { status: "ESCALATED" },
      orderBy: { escalatedAt: "desc" },
      include: { student: { select: { name: true } }, assignedTo: { select: { name: true } } },
    }),
    prisma.query.findMany({
      where: { status: { in: ["SUBMITTED", "CLASSIFYING", "ROUTED", "IN_PROGRESS"] } },
      orderBy: { createdAt: "asc" },
      take: 20,
      include: { student: { select: { name: true } }, assignedTo: { select: { name: true } } },
    }),
    prisma.user.findMany({
      where: { role: { in: [Role.INSTRUCTOR, Role.HOD] } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, role: true },
    }),
  ]);

  function OverrideForm({ query }: { query: (typeof openQueries)[number] }) {
    return (
      <form action={overrideQuery} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="queryId" value={query.id} />
        <select
          name="status"
          defaultValue={query.status}
          className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-200"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s.replace("_", " ")}</option>
          ))}
        </select>
        <select
          name="assignedToId"
          defaultValue={query.assignedToId ?? ""}
          className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-200"
        >
          <option value="">— assign —</option>
          {assignees.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.role})
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-500"
        >
          Apply
        </button>
      </form>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold text-white">HOD Console</h1>
      <p className="mt-1 text-sm text-slate-400">
        FR-07 escalated queries and FR-09 override / reassignment authority.
      </p>

      {error && (
        <p className="mt-4 rounded-lg border border-rose-800 bg-rose-950/40 px-4 py-3 text-sm text-rose-300">
          {error}
        </p>
      )}

      <h2 className="mt-8 text-sm font-semibold text-slate-300">
        ⚠️ Escalated (awaiting 24h or manual escalation)
      </h2>
      <div className="mt-3 overflow-hidden rounded-xl border border-slate-800">
        {escalated.length === 0 ? (
          <p className="bg-slate-900 p-6 text-sm text-slate-500">No escalated queries. 🎉</p>
        ) : (
          <ul className="divide-y divide-slate-800">
            {escalated.map((q) => (
              <li key={q.id} className="bg-slate-900/60 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-100">{q.subject}</p>
                    <p className="text-xs text-slate-500">
                      {q.student?.name ?? "Anonymous"} · escalated {q.escalatedAt ? new Date(q.escalatedAt).toLocaleString() : "—"}
                    </p>
                  </div>
                  <StatusBadge status={q.status} />
                </div>
                <div className="mt-3">
                  <OverrideForm query={q} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <h2 className="mt-8 text-sm font-semibold text-slate-300">Open queries</h2>
      <div className="mt-3 overflow-hidden rounded-xl border border-slate-800">
        {openQueries.length === 0 ? (
          <p className="bg-slate-900 p-6 text-sm text-slate-500">No open queries.</p>
        ) : (
          <ul className="divide-y divide-slate-800">
            {openQueries.map((q) => (
              <li key={q.id} className="bg-slate-900/60 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-100">{q.subject}</p>
                    <p className="text-xs text-slate-500">
                      {q.student?.name ?? "Anonymous"} · {q.assignedTo?.name ?? "unassigned"} ·{" "}
                      {new Date(q.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <StatusBadge status={q.status} />
                </div>
                <div className="mt-3">
                  <OverrideForm query={q} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}