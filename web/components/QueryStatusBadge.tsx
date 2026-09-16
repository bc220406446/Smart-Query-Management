import { QueryPriority, QueryStatus } from "@prisma/client";

const STATUS_CLASS: Record<QueryStatus, string> = {
  [QueryStatus.SUBMITTED]: "badge-status badge-submitted",
  [QueryStatus.ASSIGNED]: "badge-status badge-routed",
  [QueryStatus.IN_PROGRESS]: "badge-status badge-in_progress",
  [QueryStatus.RESOLVED]: "badge-status badge-resolved",
  [QueryStatus.FORWARDED_TO_HOD]: "badge-status badge-escalated",
  [QueryStatus.AUTO_ESCALATED]: "badge-status badge-escalated",
  [QueryStatus.HOD_ESCALATED]: "badge-status badge-danger",
  [QueryStatus.FORWARDED_TO_STAFF]: "badge-status badge-routed",
};

const PRIORITY_CLASS: Record<QueryPriority, string> = {
  [QueryPriority.LOW]: "badge-priority badge-priority-low",
  [QueryPriority.NORMAL]: "badge-priority badge-priority-normal",
  [QueryPriority.HIGH]: "badge-priority badge-priority-high",
  [QueryPriority.URGENT]: "badge-priority badge-priority-urgent",
};

export function StatusBadge({ status }: { status: QueryStatus }) {
  return (
    <span className={STATUS_CLASS[status]}>
      {status.replaceAll("_", " ")}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: QueryPriority }) {
  return (
    <span className={PRIORITY_CLASS[priority]}>
      {priority.replace("_", " ")}
    </span>
  );
}

export { STATUS_CLASS, PRIORITY_CLASS };
