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
import { usePathname, useRouter } from "next/navigation";

const OPEN_SECTIONS_STORAGE_KEY = "hrms.sidebar.openSections";

type SidebarContextValue = {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  pendingHref: string | null;
  openSections: Record<string, boolean>;
  toggleCollapsed: () => void;
  setMobileOpen: (open: boolean) => void;
  sectionsReady: boolean;
  toggleSection: (section: string) => void;
  setSectionOpen: (section: string, open: boolean) => void;
  ensureSectionOpenIfUnset: (section: string) => void;
  isSectionOpen: (section: string) => boolean;
  startNavigation: (href: string) => void;
  clearNavigation: () => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

type SidebarProviderProps = {
  children: ReactNode;
};

function readStoredOpenSections(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(OPEN_SECTIONS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const entries = Object.entries(parsed as Record<string, unknown>).filter(
      ([, value]) => typeof value === "boolean",
    );
    return Object.fromEntries(entries) as Record<string, boolean>;
  } catch {
    return {};
  }
}

export function SidebarProvider({ children }: SidebarProviderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [sectionsHydrated, setSectionsHydrated] = useState(false);

  useEffect(() => {
    setOpenSections(readStoredOpenSections());
    setSectionsHydrated(true);
  }, []);

  useEffect(() => {
    if (!sectionsHydrated) return;
    try {
      window.localStorage.setItem(
        OPEN_SECTIONS_STORAGE_KEY,
        JSON.stringify(openSections),
      );
    } catch {
      // Ignore quota / private-mode write failures.
    }
  }, [openSections, sectionsHydrated]);

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

  const setSectionOpen = useCallback((section: string, open: boolean) => {
    setOpenSections((current) => {
      if ((current[section] ?? false) === open) return current;
      return { ...current, [section]: open };
    });
  }, []);

  const ensureSectionOpenIfUnset = useCallback((section: string) => {
    setOpenSections((current) => {
      if (section in current) return current;
      return { ...current, [section]: true };
    });
  }, []);

  const isSectionOpen = useCallback(
    (section: string) => openSections[section] ?? false,
    [openSections],
  );

  const startNavigation = useCallback(
    (href: string) => {
      setPendingHref(href);
      try {
        const path = href.split("#")[0];
        if (path?.startsWith("/") && !path.startsWith("//")) {
          router.prefetch(path);
        }
      } catch {
        // Prefetch is best-effort.
      }
    },
    [router],
  );

  const clearNavigation = useCallback(() => {
    setPendingHref(null);
  }, []);

  const value = useMemo(
    () => ({
      isCollapsed,
      isMobileOpen,
      pendingHref,
      openSections,
      sectionsReady: sectionsHydrated,
      toggleCollapsed,
      setMobileOpen,
      toggleSection,
      setSectionOpen,
      ensureSectionOpenIfUnset,
      isSectionOpen,
      startNavigation,
      clearNavigation,
    }),
    [
      isCollapsed,
      isMobileOpen,
      pendingHref,
      openSections,
      sectionsHydrated,
      toggleCollapsed,
      setMobileOpen,
      toggleSection,
      setSectionOpen,
      ensureSectionOpenIfUnset,
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
