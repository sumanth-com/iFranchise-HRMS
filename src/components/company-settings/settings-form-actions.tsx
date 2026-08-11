"use client";

import { Loader2, RotateCcw } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/common/button";
import { StickyPageActions } from "@/components/common/sticky-layout";
import { cn } from "@/lib/utils";

type SettingsFormActionsProps = {
  canEdit: boolean;
  isDirty: boolean;
  isPending: boolean;
  onReset: () => void;
  saveLabel?: string;
  resetLabel?: string;
  placement?: "sticky" | "inline";
};

export function SettingsFormActions({
  canEdit,
  isDirty,
  isPending,
  onReset,
  saveLabel = "Save changes",
  resetLabel = "Reset changes",
  placement = "sticky",
}: SettingsFormActionsProps) {
  if (!canEdit) {
    if (placement === "inline") return null;
    return (
      <p className="text-sm text-muted-foreground">
        You have view-only access. Only Super Admin can edit company settings.
      </p>
    );
  }

  const buttons = (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!isDirty || isPending}
        onClick={onReset}
      >
        <RotateCcw className="mr-2 size-4" />
        {placement === "inline" ? "Reset" : resetLabel}
      </Button>
      <Button type="submit" size="sm" disabled={!isDirty || isPending}>
        {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
        {placement === "inline" ? "Save" : saveLabel}
      </Button>
    </div>
  );

  if (placement === "inline") {
    return buttons;
  }

  return (
    <StickyPageActions>
      <Button
        type="button"
        variant="outline"
        disabled={!isDirty || isPending}
        onClick={onReset}
      >
        <RotateCcw className="mr-2 size-4" />
        {resetLabel}
      </Button>
      <Button type="submit" disabled={!isDirty || isPending}>
        {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
        {saveLabel}
      </Button>
    </StickyPageActions>
  );
}

export function SettingsSectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm md:p-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function SettingsToggle({
  label,
  disabled,
  className,
  ...props
}: { label: string; disabled?: boolean; className?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label
      className={cn(
        "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors hover:bg-muted/40",
        disabled && "cursor-not-allowed opacity-60",
        className,
      )}
    >
      <input
        type="checkbox"
        className="size-4 shrink-0 rounded border-input accent-primary"
        disabled={disabled}
        {...props}
      />
      <span className="leading-snug">{label}</span>
    </label>
  );
}

export function SettingsField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium leading-none">{label}</label>
      {children}
    </div>
  );
}
