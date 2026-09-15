"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/roles";
import { overrideSchema } from "@/lib/validation";
import { recordAudit } from "@/lib/audit";
import { notifyUser } from "@/lib/notify";

/** FR-09: HOD / admin can override status and reassign any query. */
export async function overrideQuery(formData: FormData): Promise<void> {
  const user = await requireRole([Role.HOD, Role.ADMIN]);

  const parsed = overrideSchema.safeParse({
    queryId: formData.get("queryId"),
    status: formData.get("status"),
    assignedToId: formData.get("assignedToId") || undefined,
  });
  if (!parsed.success) {
    redirect(`/hod?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid override.")}`);
  }

  const query = await prisma.query.update({
    where: { id: parsed.data.queryId },
    data: {
      status: parsed.data.status,
      assignedToId: parsed.data.assignedToId ?? null,
      resolvedAt: parsed.data.status === "RESOLVED" ? new Date() : undefined,
      escalatedAt: parsed.data.status === "ESCALATED" ? new Date() : undefined,
    },
  });

  if (query.studentId) {
    await notifyUser({
      userId: query.studentId,
      type: "status_update",
      title: `Query status changed to ${parsed.data.status.replace("_", " ")}`,
      body: query.subject,
    });
  }
  await recordAudit({
    actorId: user.id,
    action: "override",
    entityType: "query",
    entityId: query.id,
    metadata: { status: parsed.data.status, assignedToId: parsed.data.assignedToId ?? null },
  });

  revalidatePath("/hod");
  revalidatePath("/staff/inbox");
  revalidatePath("/dashboard");
  revalidatePath("/admin");
}