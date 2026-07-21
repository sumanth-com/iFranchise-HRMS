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

type SidebarContextValue = {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  pendingHref: string | null;
  toggleCollapsed: () => void;
  setMobileOpen: (open: boolean) => void;
  startNavigation: (href: string) => void;
  clearNavigation: () => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

type SidebarProviderProps = {
  children: ReactNode;
};

export function SidebarProvider({ children }: SidebarProviderProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  const setMobileOpen = useCallback((open: boolean) => {
    setIsMobileOpen(open);
  }, []);

  const startNavigation = useCallback((href: string) => {
    setPendingHref(href);
  }, []);

  const clearNavigation = useCallback(() => {
    setPendingHref(null);
  }, []);

  const value = useMemo(
    () => ({
      isCollapsed,
      isMobileOpen,
      pendingHref,
      toggleCollapsed,
      setMobileOpen,
      startNavigation,
      clearNavigation,
    }),
    [
      isCollapsed,
      isMobileOpen,
      pendingHref,
      toggleCollapsed,
      setMobileOpen,
      startNavigation,
      clearNavigation,
    ],
  );

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);

  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }

  return context;
}
