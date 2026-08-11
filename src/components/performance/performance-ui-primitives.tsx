"use client";

import type { ReactNode } from "react";
import { Eye, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/common/button";
import { cn } from "@/lib/utils";

const ROW_ICON_BTN = "size-8 shrink-0";

export function PerformanceSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-lg border bg-muted/20 p-4", className)}>
      <div className="mb-3">
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        {description ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function DetailGrid({
  children,
  columns = 2,
}: {
  children: ReactNode;
  columns?: 1 | 2;
}) {
  return (
    <div
      className={cn(
        "grid gap-3",
        columns === 2 ? "sm:grid-cols-2" : "grid-cols-1",
      )}
    >
      {children}
    </div>
  );
}

export function DetailField({
  label,
  value,
  className,
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="mt-1 text-sm font-medium break-words leading-snug">{value}</div>
    </div>
  );
}

export function ProgressBar({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="h-2 min-w-[5rem] flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="text-xs font-medium tabular-nums text-muted-foreground">{clamped}%</span>
    </div>
  );
}

export function PerformanceTableShell({
  children,
  empty,
  className,
}: {
  children: ReactNode;
  empty?: ReactNode;
  className?: string;
}) {
  const hasTableContent = children != null && children !== false;

  if (!hasTableContent && empty) {
    return (
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">{empty}</div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className={cn("max-h-[28rem] overflow-auto", className)}>{children}</div>
    </div>
  );
}

export function TableActions({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-end gap-1">{children}</div>
  );
}

export function ViewIconButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      size="icon"
      variant="outline"
      className={ROW_ICON_BTN}
      onClick={onClick}
      disabled={disabled}
      aria-label="View"
    >
      <Eye className="size-3.5" />
    </Button>
  );
}

export function DeleteIconButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      size="icon"
      variant="outline"
      className={ROW_ICON_BTN}
      onClick={onClick}
      disabled={disabled}
      aria-label="Delete"
    >
      <Trash2 className="size-3.5" />
    </Button>
  );
}

export function EditIconButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      size="icon"
      variant="outline"
      className={ROW_ICON_BTN}
      onClick={onClick}
      disabled={disabled}
      aria-label="Edit"
    >
      <Pencil className="size-3.5" />
    </Button>
  );
}
