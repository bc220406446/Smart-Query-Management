import {
  Document,
  Page,
  Text,
  View,
  renderToBuffer,
  StyleSheet,
} from "@react-pdf/renderer";
import type { Prisma } from "@prisma/client";

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#1a1d23",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderBottomWidth: 2,
    borderBottomColor: "#161B22",
    paddingBottom: 10,
    marginBottom: 16,
  },
  title: { fontSize: 18, fontWeight: "bold", color: "#1a1d23" },
  subtitle: { fontSize: 9, color: "#6b7280", marginTop: 2 },
  row: {
    flexDirection: "row",
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: "#D3D7DE",
  },
  cell: { flex: 1, marginRight: 8 },
  cellMono: { fontFamily: "Courier", fontSize: 8 },
  small: { fontSize: 8, color: "#6b7280" },
  tableHead: {
    flexDirection: "row",
    backgroundColor: "#161B22",
    paddingVertical: 7,
    paddingHorizontal: 6,
    marginBottom: 8,
  },
  tableHeadCell: { color: "#FFFFFF", fontWeight: "bold", flex: 1, marginRight: 8 },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: "center",
    backgroundColor: "#EEF3FF",
    borderColor: "#BCD3FF",
    borderWidth: 1,
    color: "#2A4FD9",
    fontSize: 7,
    fontWeight: "bold",
  },
});

function statusColor(status?: string) {
  switch (status) {
    case "SUBMITTED":
      return "#8A93A3";
    case "CLASSIFYING":
      return "#B06A00";
    case "ROUTED":
      return "#2557D6";
    case "IN_PROGRESS":
      return "#3B6EF0";
    case "RESOLVED":
      return "#1A7F4A";
    case "ESCALATED":
      return "#C53030";
    case "CLOSED":
      return "#8A93A3";
    default:
      return "#8A93A3";
  }
}

interface QueryRow {
  ticketNumber: string;
  subject: string;
  status: string;
  priority: string;
  category?: string | null;
  channel: string;
  student?: { name: string | null; email: string | null } | null;
  assignedTo?: { name: string | null } | null;
  department?: { name: string | null } | null;
  createdAt: Date | string;
  resolvedAt?: Date | string | null;
}

function PageHeader() {
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.title}>Smart Query Hub - Query Report</Text>
        <Text style={styles.subtitle}>Generated {new Date().toLocaleString()}</Text>
      </View>
      <Text style={styles.subtitle}>Smart Query Routing &amp; Email Automation System</Text>
    </View>
  );
}

function TableHeader() {
  return (
    <View style={styles.tableHead}>
      <Text style={[styles.tableHeadCell, styles.cellMono]}>Ticket</Text>
      <Text style={[styles.tableHeadCell]}>Subject</Text>
      <Text style={[styles.tableHeadCell]}>Student</Text>
      <Text style={[styles.tableHeadCell]}>Department</Text>
      <Text style={[styles.tableHeadCell, styles.cellMono]}>Status</Text>
      <Text style={[styles.tableHeadCell, styles.cellMono]}>Priority</Text>
      <Text style={[styles.tableHeadCell, styles.cellMono]}>Created</Text>
    </View>
  );
}

function QueryRowComponent({ row }: { row: QueryRow }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.cell, styles.cellMono]}>#{row.ticketNumber.slice(0, 8)}</Text>
      <Text style={styles.cell}>{row.subject}</Text>
      <Text style={styles.cell}>{row.student?.name ?? "-"}</Text>
      <Text style={styles.cell}>{row.department?.name ?? "-"}</Text>
      <View style={styles.cell}>
        <View style={[styles.statusBadge, { backgroundColor: statusColor(row.status) + "30", borderColor: statusColor(row.status), borderWidth: 1 }]}>
          <Text style={{ color: statusColor(row.status), fontSize: 7, fontWeight: "bold", textTransform: "uppercase" }}>
            {row.status}
          </Text>
        </View>
      </View>
      <Text style={[styles.cell, styles.cellMono]}>{row.priority}</Text>
      <Text style={[styles.cell, styles.cellMono, styles.small]}>
        {new Date(row.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
      </Text>
    </View>
  );
}

export function QueryDocument({ queries }: { queries: Prisma.QueryGetPayload<{ include: { student: { select: { name: true; email: true } }; assignedTo: { select: { name: true } }; department: { select: { name: true } } } }>[] }) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <PageHeader />
        <TableHeader />
        {queries.map((q) => (
          <QueryRowComponent
            key={q.id}
            row={{
              ticketNumber: q.ticketNumber,
              subject: q.subject,
              status: q.status,
              priority: q.priority,
              category: q.category ?? null,
              channel: q.channel,
              student: q.student,
              assignedTo: q.assignedTo,
              department: q.department,
              createdAt: q.createdAt,
              resolvedAt: q.resolvedAt,
            }}
          />
        ))}
        {queries.length === 0 && (
          <Text style={{ color: "#6b7280", marginTop: 20 }}>No queries found.</Text>
        )}
      </Page>
    </Document>
  );
}

export async function pdfDocument(queries: Prisma.QueryGetPayload<{ include: { student: { select: { name: true; email: true } }; assignedTo: { select: { name: true } }; department: { select: { name: true } } } }>[]): Promise<Uint8Array> {
  const doc = <QueryDocument queries={queries} />;
  return renderToBuffer(doc);
}
