"use client";

import Image from "next/image";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { Button } from "@/components/common/button";
import brandLogo from "@/assets/Logo.png";

export function OnboardingPortalHeader() {
  const { setTheme, resolvedTheme } = useTheme();
  const [themeReady, setThemeReady] = useState(false);

  useEffect(() => {
    setThemeReady(true);
  }, []);

  const isDark = themeReady && resolvedTheme === "dark";

  return (
    <header className="sticky top-0 z-20 border-b border-border/60 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-xl bg-card shadow-sm ring-1 ring-border/60">
            <Image
              src={brandLogo}
              alt="iFranchise"
              width={36}
              height={36}
              priority
              className="size-full object-contain p-0.5"
            />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-none tracking-tight text-foreground">
              iFranchise
            </p>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              Pre-joining onboarding
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden rounded-full border border-border bg-muted/40 px-3 py-1 text-[11px] font-medium text-muted-foreground sm:inline">
            Secure candidate portal
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 px-2.5"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? (
              <>
                <Sun className="size-3.5" />
                <span className="hidden text-xs sm:inline">Light</span>
              </>
            ) : (
              <>
                <Moon className="size-3.5" />
                <span className="hidden text-xs sm:inline">Dark</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}
