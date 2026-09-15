"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/roles";
import { STAFF_ROLES } from "@/lib/roles";
import { replySchema } from "@/lib/validation";
import { recordAudit } from "@/lib/audit";
import { notifyUser } from "@/lib/notify";

async function loadAssignableQuery(queryId: string) {
  const user = await requireRole([...STAFF_ROLES]);
  const query = await prisma.query.findFirst({
    where: { id: queryId, OR: [{ assignedToId: user.id }, { status: "ESCALATED" }] },
  });
  if (!query) throw new Error("Query not found or not assigned to you.");
  return { user, query };
}

/** FR-05: staff sends a reply; the query moves to RESOLVED. */
export async function sendReply(queryId: string, formData: FormData): Promise<void> {
  const { user, query } = await loadAssignableQuery(queryId);

  const parsed = replySchema.safeParse({ body: formData.get("body") });
  if (!parsed.success) {
    redirect(`/staff/queries/${queryId}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid reply.")}`);
  }

  await prisma.$transaction([
    prisma.reply.create({
      data: { queryId: query.id, authorId: user.id, body: parsed.data.body, sentAt: new Date() },
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
    action: "reply_sent",
    entityType: "query",
    entityId: query.id,
    metadata: { toStatus: "RESOLVED" },
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