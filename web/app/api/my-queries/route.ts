import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** FR-06: JSON feed of the signed-in student's queries (used by the poller). */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (id) {
    const query = await prisma.query.findFirst({
      where: { id, studentId: session.user.id },
      include: { replies: { orderBy: { createdAt: "asc" } } },
    });
    if (!query) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(query);
  }

  const queries = await prisma.query.findMany({
    where: { studentId: session.user.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(queries);
}