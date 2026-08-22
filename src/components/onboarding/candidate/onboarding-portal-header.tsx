"use client";

import Image from "next/image";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { Button } from "@/components/common/button";
import { useOnboardingPortalProgress } from "@/components/onboarding/candidate/onboarding-portal-progress-context";
import brandLogo from "@/assets/Logo.png";
import { cn } from "@/lib/utils";

export function OnboardingPortalHeader() {
  const { setTheme, resolvedTheme } = useTheme();
  const [themeReady, setThemeReady] = useState(false);
  const progressCtx = useOnboardingPortalProgress();
  const completionPercent = progressCtx?.completionPercent ?? null;
  const wizardStep = progressCtx?.wizardStep ?? null;

  useEffect(() => {
    setThemeReady(true);
  }, []);

  const isDark = themeReady && resolvedTheme === "dark";

  return (
    <header className="sticky top-0 z-30 h-14 w-full max-w-[100vw] border-b border-border/60 bg-background/95 backdrop-blur-xl">
      <div className="mx-auto grid h-full w-full min-w-0 max-w-6xl grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-4">
        <div className="flex min-w-0 items-center gap-3 justify-self-start">
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

        {completionPercent !== null ? (
          <div
            className={cn(
              "flex min-w-0 items-center justify-center gap-2.5 px-2",
              "max-w-[min(100%,22rem)] sm:max-w-md",
            )}
          >
            <span className="hidden shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground sm:inline">
              Overall progress
            </span>
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <div className="h-1.5 min-w-[5rem] flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>
              <span className="shrink-0 text-xs font-semibold tabular-nums text-foreground">
                {completionPercent}%
              </span>
            </div>
          </div>
        ) : (
          <div aria-hidden className="hidden sm:block" />
        )}

        <div className="flex shrink-0 items-center justify-end gap-2 justify-self-end">
          {wizardStep ? (
            <span className="rounded-full border border-border bg-muted/40 px-3 py-1 text-[11px] font-semibold tabular-nums text-foreground">
              Step {wizardStep.current}/{wizardStep.total}
            </span>
          ) : null}
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
