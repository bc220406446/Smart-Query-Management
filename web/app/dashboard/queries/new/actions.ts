"use server";

import { redirect } from "next/navigation";
import { QueryChannel } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/roles";
import { submitQuerySchema } from "@/lib/validation";
import { recordAudit } from "@/lib/audit";

/** FR-02: web form submission. Writes a new query that the AI service picks up. */
export async function submitQuery(formData: FormData): Promise<void> {
  const user = await requireUser();

  const parsed = submitQuerySchema.safeParse({
    subject: formData.get("subject"),
    message: formData.get("message"),
    channel: QueryChannel.WEB,
  });

  if (!parsed.success) {
    redirect(
      `/dashboard/queries/new?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid submission.")}`,
    );
  }

  const query = await prisma.query.create({
    data: {
      subject: parsed.data.subject,
      message: parsed.data.message,
      channel: parsed.data.channel,
      studentId: user.id,
      status: "SUBMITTED",
    },
  });

  await recordAudit({
    actorId: user.id,
    action: "query_submitted",
    entityType: "query",
    entityId: query.id,
    metadata: { channel: query.channel },
  });

  redirect(`/dashboard/queries/${query.id}?submitted=1`);
}