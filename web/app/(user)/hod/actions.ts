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

  // HODs may only manage queries assigned to staff who report to them.
  // Admins retain the global override capability.
  if (user.role === Role.HOD) {
    const scopedQuery = await prisma.query.findUnique({
      where: { id: parsed.data.queryId },
      select: { assignedTo: { select: { hodId: true } } },
    });
    if (scopedQuery?.assignedTo?.hodId !== user.id) {
      redirect("/hod?error=You%20can%20only%20manage%20queries%20assigned%20to%20your%20staff.");
    }
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
