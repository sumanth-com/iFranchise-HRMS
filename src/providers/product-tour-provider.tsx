"use client";

import dynamic from "next/dynamic";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

import { hasAnyPermission } from "@/lib/permissions/utils";
import {
  completeTourAction,
  skipTourAction,
  updateTourStateAction,
} from "@/lib/product-tour/actions/tour-actions";
import { TOUR_PENDING_START_KEY } from "@/lib/product-tour/constants";
import { PRODUCT_TOUR_MAP } from "@/lib/product-tour/tour-registry";
import {
  filterTourSteps,
  findAutoStartTour,
  getPortalWelcomeTourId,
} from "@/lib/product-tour/tour-utils";
import type {
  ActiveTourSession,
  ResolvedTourStep,
  TourDefinition,
  UserTourStateMap,
} from "@/lib/product-tour/types";
import { useActivePortal } from "@/providers/active-portal-provider";
import { useAuth } from "@/providers/auth-provider";

const ProductTourOverlay = dynamic(
  () =>
    import("@/components/product-tour/product-tour-overlay").then(
      (mod) => mod.ProductTourOverlay,
    ),
  { ssr: false },
);

type ProductTourContextValue = {
  tourState: UserTourStateMap;
  activeSession: ActiveTourSession | null;
  isRunning: boolean;
  startTour: (tourId: string, options?: { force?: boolean }) => void;
  restartWelcomeTour: () => void;
  nextStep: () => void;
  previousStep: () => void;
  skipTour: () => void;
  finishTour: () => void;
  closeTour: () => void;
};

const ProductTourContext = createContext<ProductTourContextValue | null>(null);

type ProductTourProviderProps = {
  children: ReactNode;
  initialTourState: UserTourStateMap;
};

function toResolvedSteps(steps: TourDefinition["steps"]): ResolvedTourStep[] {
  return steps.map((step, index) => ({ ...step, index }));
}

export function ProductTourProvider({
  children,
  initialTourState,
}: ProductTourProviderProps) {
  const pathname = usePathname();
  const { activePortal } = useActivePortal();
  const { permissionCodes, roles, profile } = useAuth();
  const [tourState, setTourState] = useState<UserTourStateMap>(initialTourState);
  const [activeSession, setActiveSession] = useState<ActiveTourSession | null>(null);
  const autoStartAttemptedRef = useRef<string | null>(null);
  const pathnameRef = useRef(pathname);
  const writeGenerationRef = useRef(0);

  const isRunning = activeSession != null;

  const persistStatus = useCallback(
    async (tourId: string, status: "in_progress" | "skipped" | "completed") => {
      const generation = ++writeGenerationRef.current;
      const result = await updateTourStateAction({ tourId, status });
      if (generation !== writeGenerationRef.current) return;
      if (result.success) {
        setTourState(result.data);
      }
    },
    [],
  );

  const startTour = useCallback(
    (tourId: string, options?: { force?: boolean }) => {
      const definition = PRODUCT_TOUR_MAP.get(tourId);
      if (!definition) return;

      if (
        definition.permissions?.length &&
        !hasAnyPermission(permissionCodes, definition.permissions)
      ) {
        return;
      }

      const filtered = filterTourSteps(definition.steps, permissionCodes, roles);
      if (!filtered.length) return;

      const status = tourState[tourId]?.status;
      if (!options?.force && (status === "skipped" || status === "completed")) {
        return;
      }

      setActiveSession({
        definition,
        steps: toResolvedSteps(filtered),
        currentIndex: 0,
      });

      void persistStatus(tourId, "in_progress");
    },
    [permissionCodes, persistStatus, roles, tourState],
  );

  const finishTour = useCallback(() => {
    if (!activeSession) return;
    const tourId = activeSession.definition.id;
    setActiveSession(null);
    setTourState((prev) => ({
      ...prev,
      [tourId]: { status: "completed", updatedAt: new Date().toISOString() },
    }));
    void completeTourAction(tourId);
  }, [activeSession]);

  const skipTour = useCallback(() => {
    if (!activeSession) return;
    const tourId = activeSession.definition.id;
    setActiveSession(null);
    setTourState((prev) => ({
      ...prev,
      [tourId]: { status: "skipped", updatedAt: new Date().toISOString() },
    }));
    void skipTourAction(tourId);
  }, [activeSession]);

  const closeTour = useCallback(() => {
    skipTour();
  }, [skipTour]);

  const nextStep = useCallback(() => {
    if (!activeSession) return;
    const isLast = activeSession.currentIndex >= activeSession.steps.length - 1;
    if (isLast) {
      finishTour();
      return;
    }
    setActiveSession({
      ...activeSession,
      currentIndex: activeSession.currentIndex + 1,
    });
  }, [activeSession, finishTour]);

  const previousStep = useCallback(() => {
    if (!activeSession || activeSession.currentIndex <= 0) return;
    setActiveSession({
      ...activeSession,
      currentIndex: activeSession.currentIndex - 1,
    });
  }, [activeSession]);

  const restartWelcomeTour = useCallback(() => {
    const tourId = getPortalWelcomeTourId(activePortal);
    startTour(tourId, { force: true });
  }, [activePortal, startTour]);

  useEffect(() => {
    const raw = sessionStorage.getItem(TOUR_PENDING_START_KEY);
    if (!raw) return;
    try {
      const pending = JSON.parse(raw) as { userId?: string; tourId?: string };
      if (pending.userId !== profile.userId || !pending.tourId) {
        sessionStorage.removeItem(TOUR_PENDING_START_KEY);
        return;
      }
      const definition = PRODUCT_TOUR_MAP.get(pending.tourId);
      if (!definition) {
        sessionStorage.removeItem(TOUR_PENDING_START_KEY);
        return;
      }
      if (pathname !== definition.routeMatch) return;
      sessionStorage.removeItem(TOUR_PENDING_START_KEY);
      const timer = window.setTimeout(() => {
        startTour(pending.tourId!, { force: true });
      }, 350);
      return () => window.clearTimeout(timer);
    } catch {
      sessionStorage.removeItem(TOUR_PENDING_START_KEY);
    }
  }, [pathname, profile.userId, startTour]);

  useEffect(() => {
    if (isRunning) return;

    const key = `${activePortal}:${pathname}`;
    if (autoStartAttemptedRef.current === key) return;

    const tour = findAutoStartTour(
      pathname,
      activePortal,
      tourState,
      permissionCodes,
      roles,
    );
    if (!tour) return;

    autoStartAttemptedRef.current = key;

    const timer = window.setTimeout(() => {
      startTour(tour.id);
    }, 450);

    return () => window.clearTimeout(timer);
  }, [
    activePortal,
    isRunning,
    pathname,
    permissionCodes,
    roles,
    startTour,
    tourState,
  ]);

  useEffect(() => {
    if (pathnameRef.current === pathname) return;
    pathnameRef.current = pathname;
    setActiveSession(null);
  }, [pathname]);

  const value = useMemo<ProductTourContextValue>(
    () => ({
      tourState,
      activeSession,
      isRunning,
      startTour,
      restartWelcomeTour,
      nextStep,
      previousStep,
      skipTour,
      finishTour,
      closeTour,
    }),
    [
      activeSession,
      closeTour,
      finishTour,
      isRunning,
      nextStep,
      previousStep,
      restartWelcomeTour,
      skipTour,
      startTour,
      tourState,
    ],
  );

  return (
    <ProductTourContext.Provider value={value}>
      {children}
      {isRunning ? <ProductTourOverlay /> : null}
    </ProductTourContext.Provider>
  );
}

export function useProductTour(): ProductTourContextValue {
  const context = useContext(ProductTourContext);
  if (!context) {
    throw new Error("useProductTour must be used within ProductTourProvider");
  }
  return context;
}
