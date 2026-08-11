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
  openSections: Record<string, boolean>;
  toggleCollapsed: () => void;
  setMobileOpen: (open: boolean) => void;
  toggleSection: (section: string) => void;
  isSectionOpen: (section: string) => boolean;
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
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  const setMobileOpen = useCallback((open: boolean) => {
    setIsMobileOpen(open);
  }, []);

  const toggleSection = useCallback((section: string) => {
    setOpenSections((current) => ({
      ...current,
      [section]: !(current[section] ?? false),
    }));
  }, []);

  const isSectionOpen = useCallback(
    (section: string) => openSections[section] ?? false,
    [openSections],
  );

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
      openSections,
      toggleCollapsed,
      setMobileOpen,
      toggleSection,
      isSectionOpen,
      startNavigation,
      clearNavigation,
    }),
    [
      isCollapsed,
      isMobileOpen,
      pendingHref,
      openSections,
      toggleCollapsed,
      setMobileOpen,
      toggleSection,
      isSectionOpen,
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
