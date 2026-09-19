import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pdfDocument } from "@/components/QueryPdf";

export const dynamic = "force-dynamic";

/** FR-12: export query reports to PDF (admin / HOD). */
export async function GET(request: Request) {
  const session = await auth();
  const role = session?.user?.role;
  if (!role || (role !== Role.ADMIN && role !== Role.HOD)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const queryId = new URL(request.url).searchParams.get("queryId");
  const queries = await prisma.query.findMany({
    where: queryId ? { id: queryId } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      student: { select: { name: true, email: true } },
      assignedTo: { select: { name: true } },
      department: { select: { name: true } },
    },
  });

  const pdfBuffer = await pdfDocument(queries);

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="queries-${new Date().toISOString().slice(0, 10)}.pdf"`,
    },
  });
}
