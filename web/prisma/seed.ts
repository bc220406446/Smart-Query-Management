import "dotenv/config";
import { readFileSync } from "node:fs";
import { PrismaClient, Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../lib/password";

const connectionString = process.env.DATABASE_URL ?? process.env.DIRECT_URL;
if (!connectionString) throw new Error("DATABASE_URL or DIRECT_URL is required.");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const PASSWORD = "Test@123";

type AccountRow = { name: string; email: string; role: string; hodEmail: string };
function parseCsv(): AccountRow[] {
  return readFileSync(new URL("./accounts_with_hod_relation.csv", import.meta.url), "utf8")
    .trim().split(/\r?\n/).slice(1).map((line) => {
      const [name, email, role, hodEmail] = line.split(",");
      return { name: name.trim(), email: email.trim().toLowerCase(), role: role.trim(), hodEmail: (hodEmail ?? "").trim().toLowerCase() };
    });
}

function departmentCode(email: string) {
  const prefix = email.split(".")[0].replace("@vu", "").toUpperCase();
  const aliases: Record<string, string> = { MASSCOMM: "MCM", PA: "PAD", ACADEMIC: "ACA", ADMISSIONS: "ADM", FINANCE: "FIN", EXAMINATIONS: "EXAM", TECHNICAL: "TECH", ADMINISTRATION: "ADMIN", REGISTRAR: "REG" };
  return aliases[prefix] ?? prefix;
}

async function main() {
  const rows = parseCsv();
  const passwordHash = await hashPassword(PASSWORD);
  const hodRows = rows.filter((row) => row.role === "HOD");
  const staffRows = rows.filter((row) => row.role === "STAFF");
  const studentRows = rows.filter((row) => row.role === "STUDENT");
  const hodEmails = new Set([...hodRows.map((row) => row.email), ...staffRows.map((row) => row.hodEmail).filter(Boolean)]);
  const hodByEmail = new Map<string, string>();
  const departmentByCode = new Map<string, string>();

  console.log("Removing previous demo seed accounts…");
  await prisma.user.deleteMany({ where: { email: { in: ["hod.cs@vu.edu.pk", "hod.admissions@vu.edu.pk", "s.raza@vu.edu.pk", "m.tariq@vu.edu.pk", "n.ahmed@vu.edu.pk", "student.demo@vu.edu.pk", "ali.hassan@vu.edu.pk"] } } });

  console.log("Seeding departments and HODs…");
  for (const email of hodEmails) {
    const code = departmentCode(email);
    const department = await prisma.department.upsert({ where: { code }, update: { name: `${email.split(".")[0].replace(/\b\w/g, (c) => c.toUpperCase())} Department` }, create: { code, name: `${email.split(".")[0].replace(/\b\w/g, (c) => c.toUpperCase())} Department` } });
    departmentByCode.set(code, department.id);
  }
  for (const row of hodRows) {
    const user = await prisma.user.upsert({ where: { email: row.email }, update: { name: row.name, role: Role.HOD, passwordHash, departmentId: departmentByCode.get(departmentCode(row.email)) }, create: { email: row.email, name: row.name, role: Role.HOD, passwordHash, departmentId: departmentByCode.get(departmentCode(row.email)) } });
    hodByEmail.set(row.email, user.id);
  }
  for (const email of hodEmails) {
    if (!hodByEmail.has(email)) {
      const code = departmentCode(email);
      const user = await prisma.user.upsert({ where: { email }, update: { name: `HOD ${email.split(".")[0]}`, role: Role.HOD, passwordHash, departmentId: departmentByCode.get(code) }, create: { email, name: `HOD ${email.split(".")[0]}`, role: Role.HOD, passwordHash, departmentId: departmentByCode.get(code) } });
      hodByEmail.set(email, user.id);
    }
  }

  console.log(`Seeding ${rows.length} CSV accounts…`);
  for (const row of [...staffRows, ...studentRows]) {
    const isStaff = row.role === "STAFF";
    const hodId = isStaff ? hodByEmail.get(row.hodEmail) ?? null : null;
    const code = isStaff && hodId ? departmentCode(row.hodEmail) : null;
    await prisma.user.upsert({ where: { email: row.email }, update: { name: row.name, role: isStaff ? Role.INSTRUCTOR : Role.STUDENT, passwordHash, hodId, departmentId: code ? departmentByCode.get(code) ?? null : null }, create: { email: row.email, name: row.name, role: isStaff ? Role.INSTRUCTOR : Role.STUDENT, passwordHash, hodId, departmentId: code ? departmentByCode.get(code) ?? null : null } });
  }
  console.log(`Seed complete. ${rows.length} CSV accounts use password ${PASSWORD}.`);
}

main().catch((error) => { console.error(error); process.exit(1); }).finally(() => prisma.$disconnect());
