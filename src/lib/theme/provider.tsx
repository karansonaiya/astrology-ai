"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type Theme = "dark" | "light";
const THEME_COOKIE = "prerna_theme";

const ThemeContext = createContext<{ theme: Theme; toggleTheme: () => void; setTheme: (t: Theme) => void } | null>(
  null
);

export function ThemeProvider({ initialTheme, children }: { initialTheme: Theme; children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(initialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
  }, [theme]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    document.cookie = `${THEME_COOKIE}=${t}; path=/; max-age=31536000; SameSite=Lax`;
  };

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme: () => setTheme(theme === "dark" ? "light" : "dark") }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

export { THEME_COOKIE };
export type { Theme };
