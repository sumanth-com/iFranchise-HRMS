"use client";

import { useTheme } from "next-themes";
import { type ReactNode, useEffect, useRef } from "react";

/**
 * Forces light appearance on the public landing page only.
 * Survives next-themes / system dark preference so mobile/tablet never pick up dark landing styles.
 * Restores the previous theme when leaving the page.
 */
export function LandingLightMode({ children }: { children: ReactNode }) {
  const { theme, setTheme } = useTheme();
  const previousThemeRef = useRef<string | undefined>(undefined);
  const lockedRef = useRef(false);

  useEffect(() => {
    if (!lockedRef.current) {
      previousThemeRef.current = theme;
      lockedRef.current = true;
    }

    const root = document.documentElement;

    const forceLightDom = () => {
      root.classList.remove("dark");
      root.classList.add("light");
      root.style.colorScheme = "light";
      root.dataset.landingLight = "true";
    };

    setTheme("light");
    forceLightDom();

    const observer = new MutationObserver(() => {
      if (root.classList.contains("dark") || root.dataset.landingLight !== "true") {
        forceLightDom();
      }
    });
    observer.observe(root, { attributes: true, attributeFilter: ["class", "data-landing-light"] });

    return () => {
      observer.disconnect();
      lockedRef.current = false;
      delete root.dataset.landingLight;
      root.classList.remove("light");
      root.style.colorScheme = "";
      const previous = previousThemeRef.current;
      setTheme(previous && previous.length > 0 ? previous : "system");
    };
    // Intentionally run once on mount/unmount for this page session.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- landing lock must not re-run on every theme tick
  }, [setTheme]);

  return children;
}
