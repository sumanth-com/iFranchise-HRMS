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
    const stored = sessionStorage.getItem(STORAGE_KEY) as ActivePortal | null;
    if (stored && pathname.startsWith("/dashboard/system")) {
      setActivePortalState(stored);
      return;
    }
    if (
      pathname.startsWith("/dashboard") &&
      !pathname.startsWith("/dashboard/system")
    ) {
      setActivePortalState("hr");
      sessionStorage.setItem(STORAGE_KEY, "hr");
      return;
    }
    if (stored) {
      setActivePortalState(stored);
      return;
    }
    const inferred = inferPortalFromPath(pathname);
    setActivePortalState(inferred);
    sessionStorage.setItem(STORAGE_KEY, inferred);
  }, [pathname]);

  useEffect(() => {
    if (
      pathname.startsWith("/ceo") ||
      pathname.startsWith("/manager") ||
      pathname.startsWith("/employee")
    ) {
      const inferred = inferPortalFromPath(pathname);
      setActivePortalState(inferred);
      sessionStorage.setItem(STORAGE_KEY, inferred);
    }
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
