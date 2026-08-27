"use client";

import {
  AlertCircle,
  Briefcase,
  Check,
  FileText,
  GraduationCap,
  IdCard,
  Landmark,
  Lock,
  ScrollText,
  User,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { canNavigateToStep } from "@/lib/onboarding/onboarding-section-validation";
import { ONBOARDING_STEP_LABELS } from "@/lib/onboarding/onboarding-step-labels";
import { ONBOARDING_WIZARD_SECTIONS } from "@/types/onboarding";
import type { CandidatePortalContext } from "@/types/onboarding";

const STEP_ICONS: Record<string, LucideIcon> = {
  personal: User,
  identity: IdCard,
  education: GraduationCap,
  employment_history: Briefcase,
  bank: Landmark,
  terms: ScrollText,
  signature: FileText,
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
    <div className="w-full max-w-full border-b border-border">
      <div
        ref={scrollRef}
        className="w-full max-w-full overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="relative inline-flex min-w-full w-max max-w-none items-center justify-start gap-0 px-2 sm:w-full sm:justify-between sm:px-5">
          {ONBOARDING_WIZARD_SECTIONS.map((key, index) => {
            const isActive = index === activeStep;
            const isComplete = completedSteps.includes(index);
            const isAccessible = canNavigateToStep(index, context);
            const isLocked = !isAccessible;
            const StepIcon = STEP_ICONS[key] ?? User;

            const hasStepCorrection = (context.documents ?? []).some((d) => {
              if (d.reviewStatus !== "correction_requested") return false;
              if (key === "identity" && d.documentCategory === "identity") return true;
              if (key === "education" && d.documentCategory === "education") return true;
              if (key === "employment_history" && d.documentCategory === "employment") return true;
              if (key === "bank" && d.documentCategory === "bank") return true;
              if (
                key === "signature" &&
                (d.documentCategory === "offer_acceptance" || d.documentCategory === "signature")
              ) {
                return true;
              }
              return false;
            });

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
                  "group relative shrink-0 px-2 py-2.5 transition-colors duration-200 sm:px-2.5",
                  isLocked && "cursor-not-allowed",
                )}
              >
                <span
                  className={cn(
                    "flex items-center justify-center gap-1.5 whitespace-nowrap text-xs font-medium sm:text-sm",
                    isActive ? "text-foreground" : "text-muted-foreground",
                    isAccessible && !isActive && "group-hover:text-foreground",
                    isLocked && "opacity-45",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-all duration-300",
                      hasStepCorrection
                        ? "bg-amber-100 text-amber-800 ring-1 ring-amber-500/50 dark:bg-amber-950 dark:text-amber-300"
                        : isComplete
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                          : isActive
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : isLocked
                              ? "bg-muted text-muted-foreground"
                              : "bg-muted text-muted-foreground group-hover:bg-muted/80 dark:group-hover:bg-muted/60",
                    )}
                  >
                    {hasStepCorrection ? (
                      <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" strokeWidth={2.5} />
                    ) : isComplete ? (
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    ) : isLocked ? (
                      <Lock className="h-3 w-3" strokeWidth={2.5} />
                    ) : (
                      <StepIcon className="h-3.5 w-3.5" strokeWidth={2} />
                    )}
                  </span>
                  {ONBOARDING_STEP_LABELS[key]}
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
