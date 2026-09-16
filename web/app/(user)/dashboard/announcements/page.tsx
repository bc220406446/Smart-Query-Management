import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/roles";
import AnnouncementTable from "@/components/AnnouncementTable";

export const dynamic = "force-dynamic";

export default async function AnnouncementsPage() {
  await requireUser();
  const announcements = await prisma.announcement.findMany({ orderBy: { createdAt: "desc" } });
  return <main className="container-page"><div className="page-header"><div className="page-header-left"><h1 className="page-title">Announcements</h1><p className="page-subtitle">Important updates from your university.</p></div></div><AnnouncementTable announcements={announcements.map(({ id, title, body, createdAt }) => ({ id, title, body, createdAt: createdAt.toISOString() }))} /></main>;
}
