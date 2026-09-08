import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * FR-14: append an entry to the audit log. Every state change (status update,
 * reassignment, override, reply sent) should go through here.
 */
export async function recordAudit(params: {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  return prisma.auditLog.create({
    data: {
      actorId: params.actorId ?? null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      metadata: params.metadata ? (params.metadata as Prisma.InputJsonValue) : undefined,
    },
  });
}