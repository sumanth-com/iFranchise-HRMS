"use client";

import { Check, Lock } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { canNavigateToStep } from "@/lib/onboarding/onboarding-section-validation";
import { ONBOARDING_WIZARD_SECTIONS } from "@/types/onboarding";
import type { CandidatePortalContext } from "@/types/onboarding";

const STEP_LABELS: Record<string, string> = {
  personal: "Personal",
  identity: "Identity",
  education: "Education",
  employment_history: "Employment",
  bank: "Bank",
  tax: "Tax",
  policies: "Policies",
  agreements: "Agreements",
  signature: "Signature",
};

type OnboardingStepNavProps = {
  activeStep: number;
  completedSteps: number[];
  context: CandidatePortalContext;
  onStepChange: (index: number) => void;
};

export function OnboardingStepNav({
  activeStep,
  completedSteps,
  context,
  onStepChange,
}: OnboardingStepNavProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  const updateIndicator = useCallback(() => {
    const container = scrollRef.current;
    const activeEl = tabRefs.current[activeStep];
    if (!container || !activeEl) return;

    setIndicator({
      left: activeEl.offsetLeft,
      width: activeEl.offsetWidth,
    });
  }, [activeStep]);

  useEffect(() => {
    updateIndicator();
    const container = scrollRef.current;
    if (!container) return;

    const observer = new ResizeObserver(updateIndicator);
    observer.observe(container);
    for (const el of tabRefs.current) {
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [updateIndicator, activeStep]);

  useEffect(() => {
    const activeEl = tabRefs.current[activeStep];
    const container = scrollRef.current;
    if (!activeEl || !container) return;

    const targetLeft =
      activeEl.offsetLeft - container.clientWidth / 2 + activeEl.offsetWidth / 2;
    container.scrollTo({ left: Math.max(0, targetLeft), behavior: "smooth" });
  }, [activeStep]);

  return (
    <div className="relative border-b border-border/60 bg-gradient-to-b from-slate-50/90 to-white">
      <div
        ref={scrollRef}
        className="overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="relative flex min-w-max items-center justify-center gap-0 px-2 sm:min-w-full sm:justify-between sm:px-5">
          {ONBOARDING_WIZARD_SECTIONS.map((key, index) => {
            const isActive = index === activeStep;
            const isComplete = completedSteps.includes(index);
            const isAccessible = canNavigateToStep(index, context);
            const isLocked = !isAccessible;

            return (
              <button
                key={key}
                ref={(el) => {
                  tabRefs.current[index] = el;
                }}
                type="button"
                disabled={isLocked}
                onClick={() => {
                  if (isAccessible) onStepChange(index);
                }}
                className={cn(
                  "group relative shrink-0 px-2 py-4 transition-colors duration-200 sm:px-3",
                  isLocked && "cursor-not-allowed",
                )}
              >
                <span
                  className={cn(
                    "flex items-center justify-center gap-1.5 whitespace-nowrap text-xs font-medium sm:text-sm",
                    isActive ? "text-foreground" : "text-muted-foreground",
                    isAccessible && !isActive && "group-hover:text-foreground",
                    isLocked && "opacity-40",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold transition-all duration-300",
                      isComplete
                        ? "bg-emerald-100 text-emerald-700"
                        : isActive
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : isLocked
                            ? "bg-muted text-muted-foreground"
                            : "bg-muted/80 text-muted-foreground",
                    )}
                  >
                    {isComplete ? (
                      <Check className="h-3 w-3" strokeWidth={3} />
                    ) : isLocked ? (
                      <Lock className="h-2.5 w-2.5" strokeWidth={2.5} />
                    ) : (
                      index + 1
                    )}
                  </span>
                  {STEP_LABELS[key]}
                </span>
              </button>
            );
          })}

          <span
            className="pointer-events-none absolute bottom-0 h-[3px] rounded-full bg-primary shadow-[0_0_12px_rgba(0,0,0,0.15)] transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
            style={{
              left: indicator.left,
              width: indicator.width,
            }}
          />
        </div>
      </div>
    </div>
  );
}
