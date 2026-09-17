import "dotenv/config";
import { readFileSync } from "node:fs";
import { PrismaClient, QueryChannel, QueryPriority, QueryStatus, Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../lib/password";

const connectionString = process.env.DATABASE_URL ?? process.env.DIRECT_URL;
if (!connectionString) throw new Error("DATABASE_URL or DIRECT_URL is required.");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const PASSWORD = "Test@123";

const samples = [
  ["Unable to Access LMS", "I am unable to log in to the LMS. The system shows an invalid password error even though I am using the correct credentials. Please help resolve this issue."],
  ["Request for Fee Deadline Extension", "I could not submit my semester fee before the deadline due to financial difficulties. Kindly guide me about the procedure for requesting a fee deadline extension."],
  ["Missing Course in LMS", "One of my registered courses is not appearing on the LMS dashboard. Please check my course registration and update my account."],
  ["Correction Required in Student Record", "My name is incorrectly entered in the student portal. Kindly guide me on how to request a correction to my academic record."],
  ["Transcript Request", "I have completed my degree requirements and would like to apply for my official transcript. Please share the application procedure and required documents."],
  ["Result Not Updated", "My result for the recently completed semester has not been updated on the student portal. Kindly investigate the issue and provide an update."],
  ["Request for Course Selection Guidance", "I need assistance in selecting courses for the upcoming semester. Please advise me about the available courses and selection deadline."],
  ["Password Reset Request", "I have forgotten my student portal password and cannot access my account. Please help me reset my password."],
  ["Scholarship Information", "I would like to know about the available scholarships for students and the eligibility criteria for applying. Kindly provide the relevant details."],
  ["Date Sheet Clarification", "I have noticed a possible conflict in my examination date sheet. Please review my examination schedule and confirm the correct dates and timings."],
] as const;

type AccountRow = { name: string; email: string; role: string; hodEmail: string };

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];
    if (character === '"' && quoted && nextCharacter === '"') {
      value += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      values.push(value.trim());
      value = "";
    } else {
      value += character;
    }
  }

  values.push(value.trim());
  return values;
}

function parseCsv(): AccountRow[] {
  return readFileSync(new URL("./accounts_with_hod_relation.csv", import.meta.url), "utf8")
    .trim().split(/\r?\n/).slice(1).map((line) => {
      const [name, email, role, hodEmail] = parseCsvLine(line);
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

  const students = await prisma.user.findMany({ where: { role: Role.STUDENT }, select: { id: true, email: true } });
  if (!students.length) throw new Error("No seeded student accounts found.");
  for (const [index, [subject, message]] of samples.entries()) {
    const student = students[index % students.length];
    await prisma.query.create({ data: { subject, message, studentId: student.id, status: QueryStatus.SUBMITTED, priority: QueryPriority.NORMAL, channel: QueryChannel.WEB } });
  }
  console.log(`Created ${samples.length} sample queries.`);
  console.log(`Seed complete. ${rows.length} CSV accounts use password ${PASSWORD}.`);
}

main().catch((error) => { console.error(error); process.exit(1); }).finally(() => prisma.$disconnect());
