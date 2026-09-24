"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import {
  EMPLOYMENT_CATEGORY_FILTER_OPTIONS,
  type EmploymentCategoryFilter,
} from "@/lib/employees/employment-category";
import { cn } from "@/lib/utils";

type IndicatorState = {
  left: number;
  top: number;
  width: number;
  height: number;
  ready: boolean;
};

export function EmploymentCategoryFilters({
  value,
  onChange,
  disabled = false,
}: {
  value: EmploymentCategoryFilter;
  onChange: (value: EmploymentCategoryFilter) => void;
  disabled?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [indicator, setIndicator] = useState<IndicatorState>({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    ready: false,
  });

  const updateIndicator = useCallback(() => {
    const activeButton = buttonRefs.current.get(value);
    const container = containerRef.current;
    if (!activeButton || !container) return;

    const containerRect = container.getBoundingClientRect();
    const buttonRect = activeButton.getBoundingClientRect();
    setIndicator({
      left: buttonRect.left - containerRect.left,
      top: buttonRect.top - containerRect.top,
      width: buttonRect.width,
      height: buttonRect.height,
      ready: true,
    });
  }, [value]);

  useLayoutEffect(() => {
    updateIndicator();
  }, [updateIndicator]);

  useEffect(() => {
    const onResize = () => updateIndicator();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [updateIndicator]);

  return (
    <div
      ref={containerRef}
      role="tablist"
      aria-label="Employment type filters"
      className="relative inline-flex max-w-full flex-wrap items-center gap-2"
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute z-0 rounded-full bg-gradient-to-r from-blue-600 to-violet-600 shadow-sm transition-[transform,width,height] duration-200 ease-out",
          indicator.ready ? "opacity-100" : "opacity-0",
        )}
        style={{
          width: indicator.width,
          height: indicator.height,
          transform: `translate(${indicator.left}px, ${indicator.top}px)`,
        }}
      />
      {EMPLOYMENT_CATEGORY_FILTER_OPTIONS.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            ref={(node) => {
              if (node) buttonRefs.current.set(option.value, node);
              else buttonRefs.current.delete(option.value);
            }}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={disabled}
            className={cn(
              "relative z-10 h-9 rounded-full border px-4 text-xs font-semibold transition-colors duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40 focus-visible:ring-offset-2",
              "disabled:pointer-events-none disabled:opacity-60",
              active
                ? "border-transparent bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-sm"
                : "border-border bg-background/90 text-foreground hover:bg-muted/70",
            )}
            onClick={() => {
              if (active || disabled) return;
              onChange(option.value);
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
