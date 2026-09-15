import "dotenv/config";
import { PrismaClient, Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../lib/password";

const connectionString = process.env.DATABASE_URL ?? process.env.DIRECT_URL;
if (!connectionString) throw new Error("DATABASE_URL or DIRECT_URL is required.");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const departments = [
  ["Computer Sciences", "CS", "cs"], ["Management Sciences", "MGT", "mgt"], ["Economics", "ECO", "eco"],
  ["Education", "EDU", "edu"], ["English", "ENG", "eng"], ["Mass Communication", "MCM", "masscomm"],
  ["Islamic Studies", "ISL", "isl"], ["Mathematics", "MTH", "mth"], ["Pakistan Studies", "PAK", "pak"],
  ["Physics", "PHY", "phy"], ["Psychology", "PSY", "psy"], ["Public Administration", "PAD", "pa"],
  ["Sociology", "SOC", "soc"], ["Statistics", "STA", "hod-sta"], ["Urdu", "URD", "urd"],
] as const;

const instructorCodes = departments.map(([, code]) => code);
const students = [
  "SCS2601", "SCS2602", "SCS2603", "SCS2604", "SMGT2601", "SMGT2602", "SMGT2603",
  "SECO2601", "SECO2602", "SECO2603", "SEDU2601", "SEDU2602", "SEDU2603",
  "SENG2601", "SENG2602", "SENG2603",
];

function displayName(email: string) {
  return email.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

async function main() {
  const passwordHash = await hashPassword("Test@123");
  const departmentIds = new Map<string, string>();

  console.log("Seeding departments…");
  for (const [name, code] of departments) {
    const department = await prisma.department.upsert({ where: { code }, update: { name }, create: { name, code } });
    departmentIds.set(code, department.id);
  }

  const users: Array<{ email: string; role: Role; departmentCode?: string }> = [
    { email: "admin@vu.edu.pk", role: Role.ADMIN },
    ...departments.map(([, code, contact]) => ({ email: `${contact}@vu.edu.pk`, role: Role.HOD, departmentCode: code })),
    ...instructorCodes.flatMap((code) => [101, 201, 301, 401, 501, 601, 701].map((course) => ({ email: `${code}${course}.instructor@vu.edu.pk`, role: Role.INSTRUCTOR, departmentCode: code }))),
    ...students.map((id) => ({ email: `${id}@vu.edu.pk`, role: Role.STUDENT, departmentCode: id.slice(1).match(/^[A-Z]+/)?.[0] })),
  ];

  const legacyCasedEmails = users.map((user) => user.email).filter((email) => email !== email.toLowerCase());
  await prisma.user.deleteMany({ where: { email: { in: legacyCasedEmails } } });

  await prisma.user.deleteMany({
    where: { email: { in: ["hod.cs@vu.edu.pk", "hod.admissions@vu.edu.pk", "s.raza@vu.edu.pk", "m.tariq@vu.edu.pk", "n.ahmed@vu.edu.pk", "student.demo@vu.edu.pk", "ali.hassan@vu.edu.pk"] } },
  });

  console.log(`Seeding ${users.length} accounts…`);
  for (const user of users) {
    const email = user.email.toLowerCase();
    await prisma.user.upsert({
      where: { email },
      update: { name: displayName(email), role: user.role, passwordHash, departmentId: user.departmentCode ? departmentIds.get(user.departmentCode) ?? null : null },
      create: { email, name: displayName(email), role: user.role, passwordHash, departmentId: user.departmentCode ? departmentIds.get(user.departmentCode) ?? null : null },
    });
  }

  console.log("Removing previous demo seed records…");
  await prisma.notification.deleteMany({ where: { id: { startsWith: "seed-" } } });
  await prisma.auditLog.deleteMany({ where: { entityId: "seed" } });
  await prisma.query.deleteMany({ where: { id: { startsWith: "seed-" } } });

  console.log("Seed complete. All seeded accounts use password: Test@123");
}

main().catch((error) => { console.error(error); process.exit(1); }).finally(() => prisma.$disconnect());
