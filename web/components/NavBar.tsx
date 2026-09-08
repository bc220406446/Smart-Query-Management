import Link from "next/link";
import { Role } from "@prisma/client";
import type { SessionUser } from "@/lib/roles";
import SignOutButton from "@/components/SignOutButton";

const ROLE_LINKS: Record<Role, Array<{ href: string; label: string }>> = {
  [Role.STUDENT]: [
    { href: "/dashboard", label: "Overview" },
    { href: "/dashboard/queries", label: "My Queries" },
    { href: "/dashboard/queries/new", label: "New Query" },
  ],
  [Role.INSTRUCTOR]: [
    { href: "/dashboard", label: "Overview" },
    { href: "/staff/inbox", label: "Inbox" },
  ],
  [Role.HOD]: [
    { href: "/dashboard", label: "Overview" },
    { href: "/staff/inbox", label: "Inbox" },
    { href: "/hod", label: "HOD Console" },
  ],
  [Role.ADMIN]: [
    { href: "/dashboard", label: "Overview" },
    { href: "/admin", label: "Analytics" },
    { href: "/admin/announcements", label: "Announcements" },
    { href: "/admin/audit", label: "Audit Log" },
  ],
};

export default function NavBar({ user }: { user: SessionUser }) {
  const links = ROLE_LINKS[user.role] ?? [];
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center gap-2 text-sm font-semibold text-white">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-600 text-xs font-bold">
            SQ
          </span>
          Smart Query Hub
        </Link>
        <nav className="flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              {l.label}
            </Link>
          ))}
          <span className="ml-2 hidden items-center gap-2 border-l border-slate-700 pl-3 sm:flex">
            <span className="text-xs text-slate-400">
              {user.name ?? user.email}{" "}
              <span className="ml-1 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-300">
                {user.role}
              </span>
            </span>
            <SignOutButton />
          </span>
        </nav>
      </div>
    </header>
  );
}