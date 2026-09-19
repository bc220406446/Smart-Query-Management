import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/roles";
import AdminAnnouncementTable from "@/components/AdminAnnouncementTable";
export const dynamic = "force-dynamic";
export default async function AnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireRole([Role.ADMIN]);
  const { error } = await searchParams;
  const announcements = await prisma.announcement.findMany({
    orderBy: { createdAt: "desc" },
  });
  return (
    <main className="container-page">
      {error && (
        <div className="error-box" style={{ marginBottom: 20 }}>
          {error}
        </div>
      )}
      <AdminAnnouncementTable
        announcements={announcements.map((a) => ({
          id: a.id,
          title: a.title,
          body: a.body,
          createdAt: a.createdAt.toISOString(),
        }))}
      />
    </main>
  );
}
