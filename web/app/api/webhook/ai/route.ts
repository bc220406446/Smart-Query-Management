import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma, QueryPriority, QueryStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { notifyUser } from "@/lib/notify";

export const dynamic = "force-dynamic";

/**
 * Callback used by the FastAPI AI service (FR-03/04/05).
 *
 * The AI service writes classification results directly to the shared database
 * via SQLAlchemy (primary path, per the architecture), but can alternatively
 * POST the result here so the web layer centralizes notifications + audit.
 *
 * Protected by the AI_WEBHOOK_SECRET shared secret (matches
 * AI_SERVICE_WEBHOOK_SECRET in the FastAPI service's env).
 */
const webhookSchema = z.object({
  queryId: z.string().min(1),
  status: z.nativeEnum(QueryStatus).optional(),
  category: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  aiClassification: z.record(z.string(), z.unknown()).optional(),
  aiDraftReply: z.string().optional(),
  departmentId: z.string().optional(),
  assignedToId: z.string().optional(),
  priority: z.nativeEnum(QueryPriority).optional(),
});

export async function POST(request: Request) {
  const secret = request.headers.get("x-ai-secret");
  if (!process.env.AI_WEBHOOK_SECRET || secret !== process.env.AI_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = webhookSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const existing = await prisma.query.findUnique({ where: { id: data.queryId } });
  if (!existing) return NextResponse.json({ error: "Query not found" }, { status: 404 });

  const query = await prisma.query.update({
    where: { id: data.queryId },
    data: {
      status: data.status ?? existing.status,
      category: data.category ?? existing.category,
      confidence: data.confidence ?? existing.confidence,
      aiClassification: (data.aiClassification ?? existing.aiClassification) as Prisma.InputJsonValue | undefined,
      aiDraftReply: data.aiDraftReply ?? existing.aiDraftReply,
      departmentId: data.departmentId ?? existing.departmentId,
      assignedToId: data.assignedToId ?? existing.assignedToId,
      priority: data.priority ?? existing.priority,
      resolvedAt: data.status === "RESOLVED" ? new Date() : existing.resolvedAt,
    },
  });

  const statusChanged = data.status && data.status !== existing.status;
  if (statusChanged) {
    if (query.studentId) {
      await notifyUser({
        userId: query.studentId,
        type: "status_update",
        title: `Query status: ${data.status!.replace("_", " ")}`,
        body: query.subject,
      });
    }
    await recordAudit({
      action: "ai_status_update",
      entityType: "query",
      entityId: query.id,
      metadata: { from: existing.status, to: data.status, category: data.category, confidence: data.confidence },
    });
  }

  return NextResponse.json({ ok: true, queryId: query.id, status: query.status });
}

/**
 * Webhook sync path (FR-03/04/05).
 *
 * The AI service writes results directly to the shared database by default
 * (primary path). This route is the secondary, webhook-driven path: when
 * AI_WEBHOOK_SECRET is configured in BOTH services, the AI service POSTs here
 * and the web layer centralizes notifications + audit instead of the AI service
 * writing them directly.
 *
 * Either path ends up on the same rows, so UI behavior is identical.
 * Keep this in sync with the AI service's webhook config if you enable it.
 */