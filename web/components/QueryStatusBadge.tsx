import { QueryPriority, QueryStatus } from "@prisma/client";

const STATUS_STYLES: Record<QueryStatus, string> = {
  [QueryStatus.SUBMITTED]: "bg-slate-100 text-slate-700 ring-slate-300",
  [QueryStatus.CLASSIFYING]: "bg-amber-50 text-amber-700 ring-amber-300",
  [QueryStatus.ROUTED]: "bg-sky-50 text-sky-700 ring-sky-300",
  [QueryStatus.IN_PROGRESS]: "bg-indigo-50 text-indigo-700 ring-indigo-300",
  [QueryStatus.RESOLVED]: "bg-emerald-50 text-emerald-700 ring-emerald-300",
  [QueryStatus.ESCALATED]: "bg-rose-50 text-rose-700 ring-rose-300",
  [QueryStatus.CLOSED]: "bg-slate-100 text-slate-500 ring-slate-300",
};

const PRIORITY_STYLES: Record<QueryPriority, string> = {
  [QueryPriority.LOW]: "bg-slate-100 text-slate-600 ring-slate-200",
  [QueryPriority.NORMAL]: "bg-slate-100 text-slate-700 ring-slate-300",
  [QueryPriority.HIGH]: "bg-orange-50 text-orange-700 ring-orange-300",
  [QueryPriority.URGENT]: "bg-rose-50 text-rose-700 ring-rose-300",
};

function Chip({ value, styles }: { value: string; styles: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${styles}`}
    >
      {value.replace("_", " ")}
    </span>
  );
}

export function StatusBadge({ status }: { status: QueryStatus }) {
  return <Chip value={status} styles={STATUS_STYLES[status]} />;
}

export function PriorityBadge({ priority }: { priority: QueryPriority }) {
  return <Chip value={priority} styles={PRIORITY_STYLES[priority]} />;
}