import { useEffect, useState } from "react";

const THEME_KEY = "sqh-theme";

export type Theme = "light" | "dark";

export function getTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return (document.documentElement.getAttribute("data-theme") as Theme) || "light";
}

export function setTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
  try { localStorage.setItem(THEME_KEY, theme); } catch {}
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // The state update intentionally runs after hydration in the browser.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    const stored = (() => {
      try { return localStorage.getItem(THEME_KEY) as Theme | null; } catch { return null; }
    })();
    const initial: Theme = stored || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(initial);
    setThemeState(initial);
  }, []);

  const toggle = () => {
    const nextTheme: Theme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    setThemeState(nextTheme);
  };

  return { theme, isDark: theme === "dark", mounted, toggle };
}
