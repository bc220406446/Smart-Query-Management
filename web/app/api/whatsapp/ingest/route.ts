import { NextResponse } from "next/server";
import { z } from "zod";
import { QueryChannel } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { splitIncomingQuery } from "@/lib/query-submission";
import { normalizeWhatsAppPhone } from "@/lib/whatsapp";
// createQueryFromWhatsApp / WhatsAppUserMap imported for future use.

export const dynamic = "force-dynamic";

const ingestSchema = z.object({
  from: z.string().min(1, "Phone / sender is required"),
  body: z.string().min(1, "Message body is required"),
  phoneUserId: z.string().optional(),
  studentId: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = ingestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors.body?.[0] ?? "Invalid payload" }, { status: 400 });
    }

    const { from, body: message, studentId } = parsed.data;

    const normalizedFrom = normalizeWhatsAppPhone(from);
    const students = await prisma.user.findMany({ where: { role: "STUDENT", phone: { not: null } }, select: { id: true, phone: true } });
    const student = students.find((candidate) => normalizeWhatsAppPhone(candidate.phone) === normalizedFrom);
    if (!student) {
      return NextResponse.json({ ok: true, ignored: true, reason: "sender_not_registered" });
    }
    const query = await prisma.query.create({
      data: {
        ...splitIncomingQuery(undefined, message),
        channel: QueryChannel.WHATSAPP,
        status: "SUBMITTED",
        studentId: student.id,
      },
    });

    await recordAudit({
      actorId: null,
      action: "query_submitted",
      entityType: "query",
      entityId: query.id,
      metadata: { channel: "WHATSAPP", from, phoneUserId: parsed.data.phoneUserId ?? null },
    });

    return NextResponse.json({ ok: true, queryId: query.id, ticket: query.ticketNumber });
  } catch (err) {
    console.error("whatsapp ingest error:", err);
    return NextResponse.json({ error: "Ingestion failed" }, { status: 500 });
  }
}
