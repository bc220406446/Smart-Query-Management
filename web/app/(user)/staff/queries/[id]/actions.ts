"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/roles";
import { STAFF_ROLES } from "@/lib/roles";
import { replySchema } from "@/lib/validation";
import { QueryStatus } from "@prisma/client";
import { recordAudit } from "@/lib/audit";
import { notifyUserAcrossChannels } from "@/lib/notify";

async function loadAssignableQuery(queryId: string) {
  const user = await requireRole([...STAFF_ROLES]);
  const query = await prisma.query.findFirst({
    where: { id: queryId, OR: [{ assignedToId: user.id }, { status: { in: ["AUTO_ESCALATED", "HOD_ESCALATED", "FORWARDED_TO_HOD", "FORWARDED_TO_STAFF"] } }] },
    include: { assignedTo: { select: { isOnLeave: true } } },
  });
  if (!query) throw new Error("Query not found or not assigned to you.");
  return { user, query };
}

export async function generateAiDraft(queryId: string, action: "resolve" | "forward" = "resolve"): Promise<string> {
  await requireRole([...STAFF_ROLES]);
  const query = await prisma.query.findUnique({ where: { id: queryId } });
  if (!query) throw new Error("Query not found.");
  const response = await fetch(`${process.env.AI_SERVICE_URL ?? "http://localhost:8000"}/queries/draft`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subject: query.subject, message: query.message, category: query.category ?? "general", priority: query.priority, action }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("AI draft service is unavailable.");
  const data = (await response.json()) as { draft?: string };
  if (!data.draft) throw new Error("AI did not return a draft.");
  return data.draft;
}

export async function deleteQuery(queryId: string): Promise<void> {
  const user = await requireRole(["ADMIN"]);
  const query = await prisma.query.findUnique({ where: { id: queryId }, select: { id: true, subject: true } });
  if (!query) redirect("/admin/queries?error=Query%20not%20found.");
  await prisma.query.delete({ where: { id: queryId } });
  await recordAudit({ actorId: user.id, action: "query_deleted", entityType: "query", entityId: queryId, metadata: { subject: query.subject } });
  revalidatePath("/admin/queries");
  revalidatePath("/admin");
  redirect("/admin/queries?deleted=1");
}

/** FR-05: staff sends a reply; the query moves to RESOLVED. */
export async function sendReply(queryId: string, formData: FormData): Promise<void> {
  const { user, query } = await loadAssignableQuery(queryId);
  if (user.role === "INSTRUCTOR" && query.assignedTo?.isOnLeave) {
    redirect(`/staff/queries/${queryId}?error=${encodeURIComponent("Reply actions are disabled while you are on leave.")}`);
  }
  if (user.role !== "HOD" && user.role !== "ADMIN" && query.status !== "SUBMITTED" && query.status !== "ASSIGNED" && query.status !== "IN_PROGRESS" && query.status !== "FORWARDED_TO_STAFF") {
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
        data: { status, resolvedAt: status === "RESOLVED" ? new Date() : null, escalatedAt: status === "AUTO_ESCALATED" ? new Date() : null },
    }),
  ]);

  await notifyUserAcrossChannels({
    userId: query.studentId ?? "",
    type: "status_update",
    title: status === "FORWARDED_TO_HOD" ? "Your query was forwarded to the HOD" : "Your query status was updated",
    body: status === "RESOLVED" ? `"${query.subject}" has been resolved.` : `"${query.subject}" is now ${status.replace("_", " ").toLowerCase()}.`,
    queryId: query.id,
    subject: query.subject,
    details: query.message,
    status: status.replace("_", " "),
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

  await notifyUserAcrossChannels({
    userId: query.studentId ?? "",
    type: "status_update",
    title: "Your query was answered",
    body: `"${query.subject}" has been resolved.`,
    queryId: query.id,
    subject: query.subject,
    details: query.message,
    status: "RESOLVED",
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
  if (query.status !== "SUBMITTED" && query.status !== "ASSIGNED" && query.status !== "IN_PROGRESS") {
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
  if (query.studentId) await notifyUserAcrossChannels({ userId: query.studentId, type: "status_update", title: "Your query was forwarded to the HOD", body: query.subject, queryId: query.id, subject: query.subject, details: query.message, status: "FORWARDED TO HOD" });
  await recordAudit({ actorId: user.id, action: "query_forwarded_to_hod", entityType: "query", entityId: query.id });
  revalidatePath(`/staff/queries/${query.id}`);
  revalidatePath("/staff/inbox");
  revalidatePath("/hod");
  revalidatePath("/dashboard");
}

export async function forwardFromHod(queryId: string, formData: FormData): Promise<void> {
  const { user, query } = await loadAssignableQuery(queryId);
  if (user.role !== "HOD" && user.role !== "ADMIN") redirect(`/staff/queries/${queryId}?error=Only%20HOD%20users%20can%20forward%20this%20query.`);
  const parsed = replySchema.safeParse({ body: formData.get("body") });
  const assignedToId = String(formData.get("assignedToId") || "");
  if (!parsed.success || !assignedToId) redirect(`/staff/queries/${queryId}?error=Select%20a%20recipient%20and%20add%20a%20reply.`);
  await prisma.$transaction([
    prisma.reply.create({ data: { queryId: query.id, authorId: user.id, body: `[Forwarded by HOD]\n${parsed.data.body}` } }),
    prisma.query.update({ where: { id: query.id }, data: { status: "FORWARDED_TO_STAFF", assignedToId, escalatedAt: null } }),
  ]);
  await notifyUserAcrossChannels({
    userId: assignedToId,
    type: "assignment",
    title: "A query was forwarded to you",
    body: `"${query.subject}" was forwarded for your review.`,
    queryId: query.id,
    details: query.message,
  });
  await recordAudit({ actorId: user.id, action: "hod_forwarded_query", entityType: "query", entityId: query.id, metadata: { assignedToId } });
  revalidatePath(`/staff/queries/${query.id}`); revalidatePath("/staff/inbox"); revalidatePath("/hod"); revalidatePath("/dashboard");
}
