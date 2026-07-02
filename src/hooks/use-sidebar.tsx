"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type SidebarContextValue = {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  toggleCollapsed: () => void;
  setMobileOpen: (open: boolean) => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

type SidebarProviderProps = {
  children: ReactNode;
};

export function SidebarProvider({ children }: SidebarProviderProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  const setMobileOpen = useCallback((open: boolean) => {
    setIsMobileOpen(open);
  }, []);

  const value = useMemo(
    () => ({
      isCollapsed,
      isMobileOpen,
      toggleCollapsed,
      setMobileOpen,
    }),
    [isCollapsed, isMobileOpen, toggleCollapsed, setMobileOpen],
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
