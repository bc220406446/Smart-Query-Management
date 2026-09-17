"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/roles";
import { recordAudit } from "@/lib/audit";

export async function updateProfile(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").replace(/\D/g, "");

  if (name.length < 2 || name.length > 100) redirect("/dashboard/profile?error=Enter a valid name.");
  if (phone && (phone.length < 10 || phone.length > 15)) redirect("/dashboard/profile?error=Enter a valid phone number.");

  try {
    await prisma.user.update({ where: { id: user.id }, data: { name, phone: phone || null } });
    await recordAudit({ actorId: user.id, action: "profile_updated", entityType: "user", entityId: user.id, metadata: { phoneUpdated: Boolean(phone) } });
  } catch {
    redirect("/dashboard/profile?error=This phone number may already be linked to another account.");
  }
  redirect("/dashboard/profile?saved=1");
}
