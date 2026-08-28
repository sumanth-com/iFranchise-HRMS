"use client";

import { useTheme } from "next-themes";
import { type ReactNode, useEffect } from "react";

/**
 * Forces light appearance on the public landing page only.
 * Restores the user's theme when leaving the page.
 */
export function LandingLightMode({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const root = document.documentElement;
    const hadDark = root.classList.contains("dark");

    root.classList.remove("dark");
    root.classList.add("light");
    root.style.colorScheme = "light";

    return () => {
      root.classList.remove("light");
      root.style.colorScheme = "";
      if (hadDark || resolvedTheme === "dark") {
        root.classList.add("dark");
      }
    };
  }, [resolvedTheme]);

  return children;
}
