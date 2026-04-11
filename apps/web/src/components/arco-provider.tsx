"use client";

import { ConfigProvider } from "@arco-design/web-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export type DashboardTheme = "light" | "dark";

type ThemeContextValue = {
  theme: DashboardTheme;
  setTheme: (theme: DashboardTheme) => void;
  toggleTheme: () => void;
};

const THEME_STORAGE_KEY = "recon-theme";
const ThemeContext = createContext<ThemeContextValue | null>(null);

function readInitialTheme(): DashboardTheme {
  if (typeof window === "undefined") {
    return "light";
  }

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark") {
    return stored;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: DashboardTheme) {
  document.body.setAttribute("arco-theme", theme);
  document.documentElement.dataset.theme = theme;
}

function subscribeThemeChange(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("recon-theme-change", callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("recon-theme-change", callback);
  };
}

function serverThemeSnapshot(): DashboardTheme {
  return "light";
}

export function ArcoProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore<DashboardTheme>(
    subscribeThemeChange,
    readInitialTheme,
    serverThemeSnapshot
  );

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((nextTheme: DashboardTheme) => {
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    window.dispatchEvent(new Event("recon-theme-change"));
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [setTheme, theme]);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme,
    }),
    [setTheme, theme, toggleTheme]
  );

  return (
    <ThemeContext.Provider value={value}>
      <ConfigProvider>{children}</ConfigProvider>
    </ThemeContext.Provider>
  );
}

export function useDashboardTheme() {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error("useDashboardTheme must be used within ArcoProvider");
  }

  return value;
}
