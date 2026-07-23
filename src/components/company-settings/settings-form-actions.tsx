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
};

export function SettingsFormActions({
  canEdit,
  isDirty,
  isPending,
  onReset,
  saveLabel = "Save changes",
}: SettingsFormActionsProps) {
  if (!canEdit) {
    return (
      <p className="text-sm text-muted-foreground">
        You have view-only access. Only Super Admin can edit company settings.
      </p>
    );
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
        Reset changes
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
