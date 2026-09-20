"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/roles";
import { recordAudit } from "@/lib/audit";

export async function updateProfile(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").replace(/\D/g, "");
  const isOnLeave = formData.get("isOnLeave") === "on";
  const leaveStartValue = String(formData.get("leaveStart") ?? "").trim();
  const leaveEndValue = String(formData.get("leaveEnd") ?? "").trim();
  const leaveAutoReply = String(formData.get("leaveAutoReply") ?? "").trim().slice(0, 2000);
  const emailNotifications = formData.get("emailNotifications") === "on";
  const whatsappNotifications = formData.get("whatsappNotifications") === "on";

  if (name.length < 2 || name.length > 100) redirect("/dashboard/profile?error=Enter a valid name.");
  if (phone && (phone.length < 10 || phone.length > 15)) redirect("/dashboard/profile?error=Enter a valid phone number.");
  if (user.role === "INSTRUCTOR" && leaveStartValue && leaveEndValue && leaveEndValue < leaveStartValue) redirect("/dashboard/profile?error=Leave end date must be after the start date.");
  if (user.role === "INSTRUCTOR" && isOnLeave) {
    const assignedOpenQueries = await prisma.query.count({ where: { assignedToId: user.id, status: { in: ["SUBMITTED", "ASSIGNED", "IN_PROGRESS", "FORWARDED_TO_STAFF"] } } });
    if (assignedOpenQueries > 0) redirect("/dashboard/profile?error=You cannot enable leave while you have assigned unresolved queries.");
  }

  try {
    await prisma.user.update({ where: { id: user.id }, data: {
      name,
      phone: phone || null,
      emailNotifications,
      whatsappNotifications,
      ...(user.role === "INSTRUCTOR" ? {
        isOnLeave,
        leaveStart: leaveStartValue ? new Date(`${leaveStartValue}T00:00:00.000Z`) : null,
        leaveEnd: leaveEndValue ? new Date(`${leaveEndValue}T23:59:59.999Z`) : null,
        leaveAutoReply: leaveAutoReply || null,
      } : {}),
    } });
    await recordAudit({ actorId: user.id, action: "profile_updated", entityType: "user", entityId: user.id, metadata: { phoneUpdated: Boolean(phone) } });
  } catch {
    redirect("/dashboard/profile?error=This phone number may already be linked to another account.");
  }
  redirect("/dashboard/profile?saved=1");
}
