"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export default function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="app-sidebar-logout"
    >
      <LogOut size={16} aria-hidden="true" /><span>Sign out</span>
    </button>
  );
}
