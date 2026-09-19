import Link from "next/link";
import { BarChart3, ClipboardList, FileSearch, Inbox, LayoutDashboard, Megaphone, Settings2, ShieldCheck, UserRound } from "lucide-react";
import { Role } from "@prisma/client";
import type { SessionUser } from "@/lib/roles";
import SignOutButton from "@/components/SignOutButton";
import BrandMark from "@/components/BrandMark";
import ThemeToggle from "@/components/ThemeToggle";

const ROLE_LINKS: Record<Role, Array<{ href: string; label: string; icon: typeof LayoutDashboard }>> = {
  [Role.STUDENT]: [{ href: "/dashboard", label: "Overview", icon: LayoutDashboard }, { href: "/dashboard/announcements", label: "Announcements", icon: Megaphone }, { href: "/dashboard/queries", label: "Queries", icon: ClipboardList }, { href: "/dashboard/profile", label: "Profile", icon: Settings2 }],
  [Role.INSTRUCTOR]: [{ href: "/staff", label: "Overview", icon: LayoutDashboard }, { href: "/staff/inbox", label: "Inbox", icon: Inbox }, { href: "/staff/profile", label: "Profile", icon: UserRound }],
  [Role.HOD]: [{ href: "/hod", label: "Overview", icon: LayoutDashboard }, { href: "/hod/queries", label: "All Queries", icon: FileSearch }, { href: "/hod/inbox", label: "Inbox", icon: Inbox }, { href: "/hod/console", label: "HOD Console", icon: ShieldCheck }, { href: "/hod/profile", label: "Profile", icon: UserRound }],
  [Role.ADMIN]: [{ href: "/admin", label: "Overview", icon: LayoutDashboard }, { href: "/admin/queries", label: "All Queries", icon: ClipboardList }, { href: "/admin/analytics", label: "Analytics", icon: BarChart3 }, { href: "/admin/announcements", label: "Announcements", icon: Megaphone }, { href: "/admin/audit", label: "Audit Log", icon: Settings2 }, { href: "/admin/profile", label: "Profile", icon: UserRound }],
};

export default function NavBar({ user }: { user: SessionUser }) {
  const links = ROLE_LINKS[user.role] ?? [];
  const displayName = user.name ?? user.email ?? "Account";
  return <aside className="app-sidebar">
    <div className="app-sidebar-top"><Link href="/" className="app-sidebar-brand"><BrandMark size={34} /><span>Smart Query Hub</span></Link><ThemeToggle /></div>
    <div className="app-sidebar-section-label">Workspace</div>
    <nav className="app-sidebar-nav" aria-label="Workspace navigation">{links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className="app-sidebar-link"><Icon size={17} aria-hidden="true" /><span>{label}</span></Link>)}</nav>
    <div className="app-sidebar-spacer" />
    <div className="app-sidebar-profile"><div className="app-sidebar-avatar">{displayName.slice(0, 1).toUpperCase()}</div><div className="app-sidebar-user"><strong>{displayName.includes("@") ? displayName.split("@")[0] : displayName}</strong><span>{user.role}</span></div><SignOutButton /></div>
  </aside>;
}
