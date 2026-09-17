import { NextResponse } from "next/server";
import { QueryChannel, Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const emailSchema = z.object({
  from: z.string().email(),
  subject: z.string().trim().min(1).max(200),
  text: z.string().trim().min(1).max(5000),
  messageId: z.string().trim().max(255).optional(),
  threadId: z.string().trim().max(255).optional(),
});

export async function POST(request: Request) {
  const expectedSecret = process.env.EMAIL_INGEST_SECRET;
  if (!expectedSecret || request.headers.get("x-email-ingest-secret") !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = emailSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "from, subject, and text are required" }, { status: 400 });
  }

  const sender = parsed.data.from.toLowerCase().trim();
  const student = await prisma.user.findUnique({ where: { email: sender }, select: { id: true, role: true } });
  const query = await prisma.query.create({
    data: {
      subject: parsed.data.subject,
      message: parsed.data.text,
      channel: QueryChannel.EMAIL,
      status: "SUBMITTED",
      studentId: student?.role === Role.STUDENT ? student.id : null,
    },
  });

  await recordAudit({
    actorId: null,
    action: "query_submitted",
    entityType: "query",
    entityId: query.id,
    metadata: { channel: QueryChannel.EMAIL, from: sender, messageId: parsed.data.messageId ?? null, threadId: parsed.data.threadId ?? null },
  });

  const aiServiceUrl = process.env.AI_SERVICE_URL ?? "http://localhost:8000";
  void fetch(`${aiServiceUrl.replace(/\/$/, "")}/queries/process`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ limit: 10 }),
    signal: AbortSignal.timeout(2_000),
  }).catch(() => undefined);

  return NextResponse.json({ ok: true, queryId: query.id, ticket: query.ticketNumber, matchedStudent: Boolean(student?.role === Role.STUDENT) }, { status: 201 });
}
