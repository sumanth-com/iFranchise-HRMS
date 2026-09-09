"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

export type ActivePortal = "system" | "hr" | "ceo" | "manager" | "employee";

const STORAGE_KEY = "ifranchise-active-portal";

function inferPortalFromPath(pathname: string): ActivePortal {
  if (pathname.startsWith("/ceo")) return "ceo";
  if (pathname.startsWith("/manager")) return "manager";
  if (pathname.startsWith("/employee")) return "employee";
  if (
    pathname === "/dashboard/system" ||
    pathname.startsWith("/dashboard/system/")
  ) {
    return "system";
  }
  return "hr";
}

function isSystemAdminPathname(pathname: string): boolean {
  return (
    pathname === "/dashboard/system" || pathname.startsWith("/dashboard/system/")
  );
}

function isHrDashboardPathname(pathname: string): boolean {
  if (isSystemAdminPathname(pathname)) return false;
  return (
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname === "/settings" ||
    pathname.startsWith("/settings/")
  );
}

type ActivePortalContextValue = {
  activePortal: ActivePortal;
  setActivePortal: (portal: ActivePortal) => void;
};

const ActivePortalContext = createContext<ActivePortalContextValue | null>(null);

export function ActivePortalProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [activePortal, setActivePortalState] = useState<ActivePortal>(() =>
    inferPortalFromPath(pathname),
  );

  useEffect(() => {
    // Path is the source of truth for portal chrome. Never restore a stale
    // sessionStorage value (e.g. "hr") while the user is on Super Admin routes.
    if (isSystemAdminPathname(pathname)) {
      setActivePortalState("system");
      sessionStorage.setItem(STORAGE_KEY, "system");
      return;
    }

    if (isHrDashboardPathname(pathname)) {
      setActivePortalState("hr");
      sessionStorage.setItem(STORAGE_KEY, "hr");
      return;
    }

    if (
      pathname.startsWith("/ceo") ||
      pathname.startsWith("/manager") ||
      pathname.startsWith("/employee")
    ) {
      const inferred = inferPortalFromPath(pathname);
      setActivePortalState(inferred);
      sessionStorage.setItem(STORAGE_KEY, inferred);
      return;
    }

    const stored = sessionStorage.getItem(STORAGE_KEY) as ActivePortal | null;
    if (
      stored === "system" ||
      stored === "hr" ||
      stored === "ceo" ||
      stored === "manager" ||
      stored === "employee"
    ) {
      setActivePortalState(stored);
      return;
    }

    const inferred = inferPortalFromPath(pathname);
    setActivePortalState(inferred);
    sessionStorage.setItem(STORAGE_KEY, inferred);
  }, [pathname]);

  const setActivePortal = useCallback((portal: ActivePortal) => {
    sessionStorage.setItem(STORAGE_KEY, portal);
    setActivePortalState(portal);
  }, []);

  const value = useMemo(
    () => ({ activePortal, setActivePortal }),
    [activePortal, setActivePortal],
  );

  return (
    <ActivePortalContext.Provider value={value}>{children}</ActivePortalContext.Provider>
  );
}

export function useActivePortal(): ActivePortalContextValue {
  const context = useContext(ActivePortalContext);
  if (!context) {
    throw new Error("useActivePortal must be used within ActivePortalProvider");
  }
  return context;
}
