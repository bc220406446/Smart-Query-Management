import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { Role } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** FR-12: export query reports to Excel (admin / HOD). */
export async function GET() {
  const session = await auth();
  const role = session?.user?.role;
  if (!role || (role !== Role.ADMIN && role !== Role.HOD)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const queries = await prisma.query.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      student: { select: { name: true, email: true } },
      assignedTo: { select: { name: true } },
      department: { select: { name: true } },
    },
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Smart Query Hub";
  const ws = workbook.addWorksheet("Queries");

  ws.columns = [
    { header: "Ticket", key: "ticket", width: 14 },
    { header: "Subject", key: "subject", width: 40 },
    { header: "Student", key: "student", width: 24 },
    { header: "Email", key: "email", width: 28 },
    { header: "Department", key: "department", width: 20 },
    { header: "Assigned To", key: "assignedTo", width: 20 },
    { header: "Channel", key: "channel", width: 10 },
    { header: "Priority", key: "priority", width: 10 },
    { header: "Status", key: "status", width: 12 },
    { header: "Category", key: "category", width: 16 },
    { header: "Created", key: "createdAt", width: 22 },
    { header: "Resolved", key: "resolvedAt", width: 22 },
  ];

  for (const q of queries) {
    ws.addRow({
      ticket: q.ticketNumber.slice(0, 8),
      subject: q.subject,
      student: q.student?.name ?? "",
      email: q.student?.email ?? "",
      department: q.department?.name ?? "",
      assignedTo: q.assignedTo?.name ?? "",
      channel: q.channel,
      priority: q.priority,
      status: q.status,
      category: q.category ?? "",
      createdAt: q.createdAt.toISOString(),
      resolvedAt: q.resolvedAt?.toISOString() ?? "",
    });
  }

  // Header row
  ws.getRow(1).font = { bold: true, color: { argb: "FF1A1D23" } };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF161B22" } };
  ws.getRow(1).border = {
    top: { style: "thin", color: { argb: "FF161B22" } },
    bottom: { style: "thin", color: { argb: "FF161B22" } },
    left: { style: "thin", color: { argb: "FF161B22" } },
    right: { style: "thin", color: { argb: "FF161B22" } },
  };

  for (let r = 2; r <= ws.rowCount; r++) {
    ws.getRow(r).border = {
      top: { style: "hair", color: { argb: "FFD3D7DE" } },
      bottom: { style: "hair", color: { argb: "FFD3D7DE" } },
      left: { style: "hair", color: { argb: "FFD3D7DE" } },
      right: { style: "hair", color: { argb: "FFD3D7DE" } },
    };
    if (r % 2 === 0) {
      ws.getRow(r).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF6F7F9" } };
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="queries-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}