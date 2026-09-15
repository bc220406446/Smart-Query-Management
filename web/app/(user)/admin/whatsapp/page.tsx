import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/roles";
import WhatsAppConsole from "@/components/WhatsAppConsole";

export const dynamic = "force-dynamic";

export default async function WhatsAppAdminPage() {
  await requireRole([Role.ADMIN]);

  const userPhoneMap = await prisma.user.findMany({
    where: { email: { endsWith: "@vu.edu.pk" } },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  return (
    <WhatsAppConsole
      users={userPhoneMap.map((u) => ({ id: u.id, name: u.name ?? u.email, email: u.email }))}
    />
  );
}
