"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/roles";
import { announcementSchema } from "@/lib/validation";
import { recordAudit } from "@/lib/audit";

/** FR-11: admin broadcast announcement. */
export async function createAnnouncement(formData: FormData): Promise<void> {
  const user = await requireRole([Role.ADMIN]);

  const parsed = announcementSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    redirect(
      `/admin/announcements?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid announcement.")}`,
    );
  }

  await prisma.announcement.create({
    data: {
      title: parsed.data.title,
      body: parsed.data.body,
      authorId: user.id,
    },
  });

  await recordAudit({
    actorId: user.id,
    action: "announcement_created",
    entityType: "announcement",
    metadata: { title: parsed.data.title },
  });

  revalidatePath("/admin/announcements");
  revalidatePath("/dashboard");
}

export async function updateAnnouncement(formData: FormData): Promise<void> {
  const user = await requireRole([Role.ADMIN]);
  const id = String(formData.get("id") ?? "");
  const parsed = announcementSchema.safeParse({ title: formData.get("title"), body: formData.get("body") });
  if (!id || !parsed.success) redirect(`/admin/announcements?error=${encodeURIComponent("Enter a valid subject and message.")}`);
  await prisma.announcement.update({ where: { id }, data: { title: parsed.data.title, body: parsed.data.body } });
  await recordAudit({ actorId: user.id, action: "announcement_updated", entityType: "announcement", entityId: id, metadata: { title: parsed.data.title } });
  revalidatePath("/admin/announcements"); revalidatePath("/dashboard/announcements");
}

export async function deleteAnnouncement(formData: FormData): Promise<void> {
  const user = await requireRole([Role.ADMIN]);
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/admin/announcements?error=Invalid%20announcement.");
  await prisma.announcement.delete({ where: { id } });
  await recordAudit({ actorId: user.id, action: "announcement_deleted", entityType: "announcement", entityId: id });
  revalidatePath("/admin/announcements"); revalidatePath("/dashboard/announcements");
}
