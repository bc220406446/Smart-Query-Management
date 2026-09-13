"use client";

import { useTheme } from "@/lib/theme";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const { isDark, mounted, toggle } = useTheme();

  if (!mounted) {
    return <span style={{ display: "inline-block", width: 36, height: 36 }} aria-hidden="true" />;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="btn btn-ghost btn-sm"
      style={{ minWidth: 36 }}
    >
      {isDark ? <Sun size={16} strokeWidth={2} /> : <Moon size={16} strokeWidth={2} />}
    </button>
  );
}
