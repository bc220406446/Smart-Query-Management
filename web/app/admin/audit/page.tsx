import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function AuditLogPage() {
  await requireRole([Role.ADMIN]);
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { actor: { select: { name: true } } },
  });

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold text-white">Audit Log</h1>
      <p className="mt-1 text-sm text-slate-400">FR-14 — every state change, reassignment, and override.</p>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-800">
        {logs.length === 0 ? (
          <p className="bg-slate-900 p-8 text-center text-sm text-slate-500">No activity recorded yet.</p>
        ) : (
          <ul className="divide-y divide-slate-800">
            {logs.map((log) => (
              <li key={log.id} className="flex items-start justify-between gap-4 bg-slate-900/60 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-200">{log.action.replace("_", " ")}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {log.actor?.name ?? "System"} · {log.entityType}
                    {log.entityId ? ` #${log.entityId.slice(0, 8)}` : ""}
                  </p>
                </div>
                <p className="shrink-0 text-xs text-slate-600">{new Date(log.createdAt).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}