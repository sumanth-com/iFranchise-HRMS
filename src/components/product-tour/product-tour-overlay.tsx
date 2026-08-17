"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { Button } from "@/components/common/button";
import { computePopoverPosition } from "@/lib/product-tour/tour-utils";
import { useProductTour } from "@/providers/product-tour-provider";
import { cn } from "@/lib/utils";

const POPOVER_WIDTH = 320;

function queryVisibleTarget(selector: string): Element | null {
  const matches = Array.from(document.querySelectorAll(selector));
  return (
    matches.find((element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        rect.width > 0 &&
        rect.height > 0
      );
    }) ?? null
  );
}

export function ProductTourOverlay() {
  const {
    activeSession,
    nextStep,
    previousStep,
    skipTour,
    finishTour,
    closeTour,
  } = useProductTour();
  const [mounted, setMounted] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const step = activeSession?.steps[activeSession.currentIndex];
  const totalSteps = activeSession?.steps.length ?? 0;
  const currentIndex = activeSession?.currentIndex ?? 0;
  const isLastStep = activeSession != null && currentIndex >= totalSteps - 1;
  const isCompleteStep = step?.id === "complete" || isLastStep;

  const updateGeometry = useCallback(() => {
    if (!step?.target) {
      setTargetRect(null);
      return;
    }
    const element = queryVisibleTarget(step.target);
    if (!element) {
      setTargetRect(null);
      return;
    }
    element.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
    window.setTimeout(() => {
      const next = queryVisibleTarget(step.target!);
      setTargetRect(next ? next.getBoundingClientRect() : null);
    }, 160);
  }, [step]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const onChange = () => setIsMobile(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useLayoutEffect(() => {
    if (!activeSession || !step) return;
    updateGeometry();
  }, [activeSession, step, updateGeometry]);

  useEffect(() => {
    if (!activeSession) return;

    const onResize = () => updateGeometry();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [activeSession, updateGeometry]);

  useEffect(() => {
    if (!activeSession) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeTour();
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        if (isCompleteStep) finishTour();
        else nextStep();
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        previousStep();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeSession, closeTour, finishTour, isCompleteStep, nextStep, previousStep]);

  useEffect(() => {
    if (!activeSession) return;
    const timer = window.setTimeout(() => {
      popoverRef.current?.focus();
    }, 40);
    return () => window.clearTimeout(timer);
  }, [activeSession, currentIndex]);

  if (!mounted || !activeSession || !step) return null;

  const useSheet = isMobile || !targetRect;
  const position = computePopoverPosition(targetRect, step.placement, useSheet);

  const spotlightStyle = targetRect
    ? {
        top: Math.max(8, targetRect.top - 4),
        left: Math.max(8, targetRect.left - 4),
        width: targetRect.width + 8,
        height: targetRect.height + 8,
      }
    : null;

  return createPortal(
    <div className="fixed inset-0 z-[250]" role="presentation">
      {spotlightStyle ? (
        <>
          <button
            type="button"
            className="absolute inset-0 cursor-default bg-transparent"
            aria-label="Close product tour"
            onClick={closeTour}
          />
          <div
            className="pointer-events-none absolute rounded-lg ring-2 ring-primary shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] transition-[top,left,width,height] duration-200"
            style={spotlightStyle}
            aria-hidden="true"
          />
        </>
      ) : (
        <button
          type="button"
          className="absolute inset-0 cursor-default bg-black/45"
          aria-label="Close product tour"
          onClick={closeTour}
        />
      )}

      <div
        ref={popoverRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-tour-title"
        aria-describedby="product-tour-description"
        tabIndex={-1}
        className={cn(
          "absolute z-[251] rounded-xl border bg-popover text-popover-foreground shadow-lg outline-none",
          useSheet ? "inset-x-3 bottom-3 max-w-none" : "max-w-sm",
        )}
        style={
          useSheet
            ? undefined
            : {
                top: position.top,
                left: position.left,
                width: POPOVER_WIDTH,
              }
        }
      >
        <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Product tour · {currentIndex + 1} of {totalSteps}
            </p>
            <h2 id="product-tour-title" className="mt-1 text-sm font-semibold tracking-tight">
              {step.title}
            </h2>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={closeTour}
            aria-label="Close product tour"
          >
            <X className="size-4" />
          </Button>
        </div>

        <div className="px-4 py-3">
          <p
            id="product-tour-description"
            className="text-sm leading-relaxed text-muted-foreground"
          >
            {step.description}
          </p>
        </div>

        <div className="flex items-center justify-between gap-2 border-t px-4 py-3">
          <Button type="button" variant="ghost" size="sm" onClick={skipTour}>
            Skip tour
          </Button>
          <div className="flex items-center gap-2">
            {currentIndex > 0 ? (
              <Button type="button" variant="outline" size="sm" onClick={previousStep}>
                Back
              </Button>
            ) : null}
            {isCompleteStep ? (
              <Button type="button" size="sm" onClick={finishTour}>
                Finish
              </Button>
            ) : (
              <Button type="button" size="sm" onClick={nextStep}>
                Next
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
