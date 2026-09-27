import type { QueryPriority, QueryStatus } from "@prisma/client";

const STATUS = {
  SUBMITTED: "SUBMITTED",
  ASSIGNED: "ASSIGNED",
  IN_PROGRESS: "IN_PROGRESS",
  RESOLVED: "RESOLVED",
  FORWARDED_TO_HOD: "FORWARDED_TO_HOD",
  AUTO_ESCALATED: "AUTO_ESCALATED",
  HOD_ESCALATED: "HOD_ESCALATED",
  FORWARDED_TO_STAFF: "FORWARDED_TO_STAFF",
} as const;

const PRIORITY = {
  LOW: "LOW",
  NORMAL: "NORMAL",
  HIGH: "HIGH",
  URGENT: "URGENT",
} as const;

const STATUS_CLASS: Record<QueryStatus, string> = {
  [STATUS.SUBMITTED]: "badge-status badge-submitted",
  [STATUS.ASSIGNED]: "badge-status badge-routed",
  [STATUS.IN_PROGRESS]: "badge-status badge-in_progress",
  [STATUS.RESOLVED]: "badge-status badge-resolved",
  [STATUS.FORWARDED_TO_HOD]: "badge-status badge-escalated",
  [STATUS.AUTO_ESCALATED]: "badge-status badge-escalated",
  [STATUS.HOD_ESCALATED]: "badge-status badge-danger",
  [STATUS.FORWARDED_TO_STAFF]: "badge-status badge-routed",
};

const PRIORITY_CLASS: Record<QueryPriority, string> = {
  [PRIORITY.LOW]: "badge-priority badge-priority-low",
  [PRIORITY.NORMAL]: "badge-priority badge-priority-normal",
  [PRIORITY.HIGH]: "badge-priority badge-priority-high",
  [PRIORITY.URGENT]: "badge-priority badge-priority-urgent",
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
