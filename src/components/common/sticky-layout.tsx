"use client";

import { type ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Approximate sticky action bar height — used for scroll clearance. */
export const STICKY_PAGE_ACTIONS_OFFSET = "5.5rem";

type ModuleShellProps = {
  header: ReactNode;
  children: ReactNode;
  className?: string;
  /** Optional classes for the scrollable content region below the sticky header. */
  contentClassName?: string;
};

/**
 * Pins module sub-navigation above the scrollable content area.
 * Content never scrolls underneath the header (separate scroll region).
 * Applies a consistent vertical rhythm (`gap-6`) between page sections.
 */
export function ModuleShell({
  header,
  children,
  className,
  contentClassName,
}: ModuleShellProps) {
  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <div className="z-40 shrink-0 border-b border-border bg-background px-4 pt-4 pb-3 md:px-6">
        {header}
      </div>
      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-6 pb-8 md:px-6",
          contentClassName,
        )}
      >
        <div className="flex min-h-full flex-col gap-6">{children}</div>
      </div>
    </div>
  );
}

type PageScrollProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Default scroll container for pages without a module sub-nav header.
 * Applies the same vertical rhythm (`gap-6`) as ModuleShell.
 */
export function PageScroll({ children, className }: PageScrollProps) {
  return (
    <div
      className={cn(
        "min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 pb-8 md:p-6 md:pb-8",
        className,
      )}
    >
      <div className="flex min-h-full flex-col gap-6">{children}</div>
    </div>
  );
}

type StickyPageActionsProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Solid sticky footer action bar with automatic clearance above it
 * so the last form fields, cards, and rows are never covered.
 *
 * Place as the last child of a `min-h-full flex flex-col` (or `flex-1 flex flex-col`) form/page.
 */
export function StickyPageActions({ children, className }: StickyPageActionsProps) {
  return (
    <div className="mt-auto">
      {/*
        Clearance scroll room: when the bar sticks to the viewport bottom,
        content can still scroll fully into view above it.
      */}
      <div
        aria-hidden
        className="shrink-0"
        style={{ height: STICKY_PAGE_ACTIONS_OFFSET }}
      />
      <div
        className={cn(
          "sticky bottom-0 z-30 -mx-4 border-t border-border bg-background px-4 py-3 md:-mx-6 md:px-6",
          className,
        )}
      >
        <div className="flex flex-wrap items-center justify-end gap-3 rounded-xl border bg-card p-3 shadow-sm sm:p-4">
          {children}
        </div>
      </div>
    </div>
  );
}
