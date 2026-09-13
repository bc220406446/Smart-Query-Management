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
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        height: "56px",
        background: "var(--bg-elevated)",
        borderBottom: "1px solid var(--border-light)",
        boxShadow: "var(--shadow-xs)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <Link
        href="/dashboard"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          fontSize: "15px",
          fontWeight: 600,
          color: "var(--text-primary)",
          textDecoration: "none",
        }}
      >
        <span
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            borderRadius: "8px",
            background: "var(--brand-500)",
            color: "var(--brand-contrast)",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.02em",
          }}
        >
          SQ
        </span>
        <span style={{ letterSpacing: "0.01em" }}>Smart Query Hub</span>
      </Link>

      <nav style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="nav-link"
            style={{
              display: "flex",
              alignItems: "center",
              padding: "7px 12px",
              fontSize: 13,
              fontWeight: 500,
              color: "var(--text-secondary)",
              borderRadius: "8px",
              textDecoration: "none",
              transition: "background 0.15s ease, color 0.15s ease",
            }}
          >
            {l.label}
          </Link>
        ))}
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginLeft: 16,
            paddingLeft: 16,
            borderLeft: "1px solid var(--border-light)",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-secondary)" }}>
            <span style={{ lineHeight: 1.4 }}>{user.name ?? user.email}</span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "2px 8px",
                borderRadius: "20px",
                background: `${user.role === "ADMIN" ? "var(--brand-50)" : user.role === "HOD" ? "var(--warning-bg)" : user.role === "INSTRUCTOR" ? "var(--info-bg)" : "var(--bg-muted)"}`,
                border: "1px solid " + (user.role === "ADMIN"
                  ? "var(--brand-100)"
                  : user.role === "HOD"
                  ? "var(--warning-border)"
                  : user.role === "INSTRUCTOR"
                  ? "var(--info-border)"
                  : "var(--border-light)"),
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color:
                  user.role === "ADMIN"
                    ? "var(--brand-700)"
                    : user.role === "HOD"
                    ? "var(--warning)"
                    : user.role === "INSTRUCTOR"
                    ? "var(--info)"
                    : "var(--text-tertiary)",
              }}
            >
              {user.role}
            </span>
          </span>
          <SignOutButton />
        </span>
      </nav>
    </header>
  );
}
