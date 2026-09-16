import "dotenv/config";
import { PrismaClient, QueryChannel, QueryPriority, QueryStatus, Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL ?? process.env.DIRECT_URL;
if (!connectionString) throw new Error("DATABASE_URL or DIRECT_URL is required.");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

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

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

async function main() {
  const students = await prisma.user.findMany({
    where: { role: Role.STUDENT },
    select: { id: true, email: true },
  });
  if (!students.length) throw new Error("No seeded student accounts found. Run npm run db:seed first.");

  const pickedStudents = shuffle(students);
  for (const [index, [subject, message]] of samples.entries()) {
    const student = pickedStudents[index % pickedStudents.length];
    const query = await prisma.query.create({
      data: {
        subject,
        message,
        studentId: student.id,
        status: QueryStatus.SUBMITTED,
        priority: QueryPriority.NORMAL,
        channel: QueryChannel.WEB,
      },
    });
    console.log(`${index + 1}. ${query.ticketNumber} <- ${student.email}: ${subject}`);
  }
  console.log(`Created ${samples.length} sample queries.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
