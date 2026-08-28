"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { LandingDesktopExperience } from "@/components/landing/landing-desktop-experience";
import { navigateToLogin } from "@/lib/landing/navigate-to-login";
import { LANDING_MOBILE_TABLET_MEDIA_QUERY } from "@/lib/landing/landing-viewport";

type LandingCtaContextValue = {
  isMobileOrTablet: boolean;
  handleLandingCta: () => void;
};

const LandingCtaContext = createContext<LandingCtaContextValue | null>(null);

export { LandingCtaContext };

export function LandingCtaProvider({ children }: { children: ReactNode }) {
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);
  const [desktopExperienceOpen, setDesktopExperienceOpen] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(LANDING_MOBILE_TABLET_MEDIA_QUERY);
    const sync = () => setIsMobileOrTablet(mediaQuery.matches);
    sync();
    mediaQuery.addEventListener("change", sync);
    return () => mediaQuery.removeEventListener("change", sync);
  }, []);

  const handleLandingCta = useCallback(() => {
    if (isMobileOrTablet) {
      setDesktopExperienceOpen(true);
      return;
    }
    navigateToLogin();
  }, [isMobileOrTablet]);

  const value = useMemo(
    () => ({ isMobileOrTablet, handleLandingCta }),
    [isMobileOrTablet, handleLandingCta],
  );

  return (
    <LandingCtaContext.Provider value={value}>
      {children}
      <LandingDesktopExperience
        open={desktopExperienceOpen}
        onOpenChange={setDesktopExperienceOpen}
      />
    </LandingCtaContext.Provider>
  );
}

export function useLandingCta() {
  const context = useContext(LandingCtaContext);
  if (!context) {
    throw new Error("useLandingCta must be used within LandingCtaProvider");
  }
  return context;
}
