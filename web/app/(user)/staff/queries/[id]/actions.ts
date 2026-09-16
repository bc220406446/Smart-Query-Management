"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/roles";
import { STAFF_ROLES } from "@/lib/roles";
import { replySchema } from "@/lib/validation";
import { QueryStatus } from "@prisma/client";
import { recordAudit } from "@/lib/audit";
import { notifyUser } from "@/lib/notify";

async function loadAssignableQuery(queryId: string) {
  const user = await requireRole([...STAFF_ROLES]);
  const query = await prisma.query.findFirst({
    where: { id: queryId, OR: [{ assignedToId: user.id }, { status: { in: ["ESCALATED", "FORWARDED_TO_HOD"] } }] },
  });
  if (!query) throw new Error("Query not found or not assigned to you.");
  return { user, query };
}

/** FR-05: staff sends a reply; the query moves to RESOLVED. */
export async function sendReply(queryId: string, formData: FormData): Promise<void> {
  const { user, query } = await loadAssignableQuery(queryId);
  if (query.status === "FORWARDED_TO_HOD" || query.status === "ESCALATED") {
    redirect(`/staff/queries/${queryId}?error=${encodeURIComponent("This query has already been forwarded to the HOD and cannot receive another staff reply.")}`);
  }

  const parsed = replySchema.safeParse({ body: formData.get("body") });
  const status = String(formData.get("status") || "RESOLVED") as QueryStatus;
  if (!Object.values(QueryStatus).includes(status)) {
    redirect(`/staff/queries/${queryId}?error=Please select a valid status.`);
  }
  if (!parsed.success) {
    redirect(`/staff/queries/${queryId}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid reply.")}`);
  }

  await prisma.$transaction([
    prisma.reply.create({
      data: { queryId: query.id, authorId: user.id, body: parsed.data.body, sentAt: new Date() },
    }),
    prisma.query.update({
      where: { id: query.id },
        data: { status, resolvedAt: status === "RESOLVED" || status === "CLOSED" ? new Date() : null, escalatedAt: status === "ESCALATED" ? new Date() : null },
    }),
  ]);

  await notifyUser({
    userId: query.studentId ?? "",
    type: "status_update",
    title: status === "FORWARDED_TO_HOD" ? "Your query was forwarded to the HOD" : "Your query status was updated",
    body: status === "RESOLVED" ? `"${query.subject}" has been resolved.` : `"${query.subject}" is now ${status.replace("_", " ").toLowerCase()}.`,
  });
  await recordAudit({
    actorId: user.id,
    action: "reply_sent",
    entityType: "query",
    entityId: query.id,
    metadata: { toStatus: status },
  });

  revalidatePath(`/staff/queries/${query.id}`);
  revalidatePath("/staff/inbox");
  revalidatePath("/dashboard");
}

/** FR-05: one-click approval of the AI-drafted reply. */
export async function approveAiDraft(queryId: string): Promise<void> {
  const { user, query } = await loadAssignableQuery(queryId);
  if (!query.aiDraftReply) {
    redirect(`/staff/queries/${queryId}?error=${encodeURIComponent("No AI draft available for this query.")}`);
  }

  await prisma.$transaction([
    prisma.reply.create({
      data: {
        queryId: query.id,
        authorId: user.id,
        body: query.aiDraftReply,
        sentAt: new Date(),
      },
    }),
    prisma.query.update({
      where: { id: query.id },
      data: { status: "RESOLVED", resolvedAt: new Date() },
    }),
  ]);

  await notifyUser({
    userId: query.studentId ?? "",
    type: "status_update",
    title: "Your query was answered",
    body: `"${query.subject}" has been resolved.`,
  });
  await recordAudit({
    actorId: user.id,
    action: "ai_draft_approved",
    entityType: "query",
    entityId: query.id,
  });

  revalidatePath(`/staff/queries/${query.id}`);
  revalidatePath("/staff/inbox");
}

export async function forwardToHod(queryId: string, formData: FormData): Promise<void> {
  const { user, query } = await loadAssignableQuery(queryId);
  if (query.status === "FORWARDED_TO_HOD" || query.status === "ESCALATED") {
    redirect(`/staff/queries/${queryId}?error=${encodeURIComponent("This query has already been forwarded to the HOD.")}`);
  }
  const parsed = replySchema.safeParse({ body: formData.get("body") });
  if (!parsed.success) {
    redirect(`/staff/queries/${queryId}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Add a forwarding note.")}`);
  }

  await prisma.$transaction([
    prisma.reply.create({ data: { queryId: query.id, authorId: user.id, body: `[Forwarded to HOD]\n${parsed.data.body}` } }),
    prisma.query.update({ where: { id: query.id }, data: { status: "FORWARDED_TO_HOD" } }),
  ]);
  if (query.studentId) await notifyUser({ userId: query.studentId, type: "status_update", title: "Your query was forwarded to the HOD", body: query.subject });
  await recordAudit({ actorId: user.id, action: "query_forwarded_to_hod", entityType: "query", entityId: query.id });
  revalidatePath(`/staff/queries/${query.id}`);
  revalidatePath("/staff/inbox");
  revalidatePath("/hod");
  revalidatePath("/dashboard");
}
