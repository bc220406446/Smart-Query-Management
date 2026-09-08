/* Seed script — run with `npm run db:seed`.
   Creates departments, sample users for every role, and a few demo queries
   so the dashboards and the AI pipeline have data to work with. Idempotent. */
import { PrismaClient, QueryChannel, Role } from "@prisma/client";

const prisma = new PrismaClient();

const DEPARTMENTS = [
  { name: "Computer Science", code: "CS" },
  { name: "Business Administration", code: "BA" },
  { name: "Electrical Engineering", code: "EE" },
  { name: "Admissions Office", code: "ADM" },
  { name: "Examination Department", code: "EXAM" },
  { name: "Student Affairs", code: "SA" },
];

const USERS: Array<{ email: string; name: string; role: Role; departmentCode?: string; isOnLeave?: boolean }> = [
  // Admin
  { email: "admin@vu.edu.pk", name: "System Admin", role: Role.ADMIN },
  // HODs
  { email: "hod.cs@vu.edu.pk", name: "Dr. Ayesha Khan", role: Role.HOD, departmentCode: "CS" },
  { email: "hod.admissions@vu.edu.pk", name: "Ms. Fatima Ali", role: Role.HOD, departmentCode: "ADM" },
  // Instructors
  { email: "s.raza@vu.edu.pk", name: "Sir Saad Raza", role: Role.INSTRUCTOR, departmentCode: "CS" },
  { email: "m.tariq@vu.edu.pk", name: "Mr. Muhammad Tariq", role: Role.INSTRUCTOR, departmentCode: "CS", isOnLeave: true },
  { email: "n.ahmed@vu.edu.pk", name: "Ms. Nida Ahmed", role: Role.INSTRUCTOR, departmentCode: "BA" },
  // Students
  { email: "student.demo@vu.edu.pk", name: "Demo Student", role: Role.STUDENT },
  { email: "ali.hassan@vu.edu.pk", name: "Ali Hassan", role: Role.STUDENT },
];

async function main() {
  console.log("Seeding departments…");
  const deptById = new Map<string, string>();
  for (const d of DEPARTMENTS) {
    const row = await prisma.department.upsert({
      where: { code: d.code },
      update: { name: d.name },
      create: d,
    });
    deptById.set(d.code, row.id);
  }

  console.log("Seeding users…");
  const admin = await prisma.user.upsert({
    where: { email: "admin@vu.edu.pk" },
    update: { name: "System Admin", role: Role.ADMIN },
    create: { email: "admin@vu.edu.pk", name: "System Admin", role: Role.ADMIN },
  });

  const userIdByEmail = new Map<string, string>([["admin@vu.edu.pk", admin.id]]);
  for (const u of USERS) {
    const row = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role,
        departmentId: u.departmentCode ? deptById.get(u.departmentCode) : null,
        isOnLeave: u.isOnLeave ?? false,
      },
      create: {
        email: u.email,
        name: u.name,
        role: u.role,
        departmentId: u.departmentCode ? deptById.get(u.departmentCode) : null,
        isOnLeave: u.isOnLeave ?? false,
      },
    });
    userIdByEmail.set(u.email, row.id);
  }

  console.log("Seeding sample queries…");
  const csDept = deptById.get("CS")!;
  const examDept = deptById.get("EXAM")!;
  const studentId = userIdByEmail.get("student.demo@vu.edu.pk")!;
  const csHodId = userIdByEmail.get("hod.cs@vu.edu.pk")!;
  const instructorId = userIdByEmail.get("s.raza@vu.edu.pk")!;

  const sampleQueries = [
    {
      id: "seed-q-1",
      subject: "How do I register for CS302 this semester?",
      message:
        "I am a second-semester CS student and I cannot find CS302 in my course registration portal. Could you help me register or tell me who to contact?",
      channel: QueryChannel.WEB,
      category: "registration",
      status: "ROUTED" as const,
      assignedToId: instructorId,
      departmentId: csDept,
    },
    {
      id: "seed-q-2",
      subject: "Missing marks in MGT211 final result",
      message:
        "My MGT211 result shows 'incomplete' even though I appeared in the final exam. Please check my paper.",
      channel: QueryChannel.EMAIL,
      category: "exam",
      status: "SUBMITTED" as const,
      departmentId: examDept,
    },
    {
      id: "seed-q-3",
      subject: "Fee deadline extension request",
      message: "I would like to request an extension for the fee payment deadline due to a family emergency.",
      channel: QueryChannel.WEB,
      category: "fee",
      status: "IN_PROGRESS" as const,
      departmentId: deptById.get("BA")!,
    },
  ];

  for (const q of sampleQueries) {
    await prisma.query.upsert({
      where: { id: q.id },
      update: {},
      create: {
        id: q.id,
        subject: q.subject,
        message: q.message,
        channel: q.channel,
        category: q.category,
        status: q.status,
        studentId,
        assignedToId: q.assignedToId ?? null,
        departmentId: q.departmentId ?? null,
      },
    });
  }

  // A couple of notifications so the bell isn't empty on first login.
  await prisma.notification.upsert({
    where: { id: "seed-notif-1" },
    update: {},
    create: {
      id: "seed-notif-1",
      userId: studentId,
      type: "announcement",
      title: "Welcome to the Smart Query Hub",
      body: "Track all your university queries in one place. Submit a new query any time.",
    },
  });

  // An audit log entry for the welcome event.
  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: "seed",
      entityType: "system",
      entityId: "seed",
      metadata: { note: "Database seeded with demo data" },
    },
  });

  console.log("Seed complete. Sample logins:");
  console.log("  admin@vu.edu.pk   — ADMIN");
  console.log("  hod.cs@vu.edu.pk  — HOD (CS)");
  console.log("  s.raza@vu.edu.pk  — INSTRUCTOR (CS)");
  console.log("  student.demo@vu.edu.pk — STUDENT");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });