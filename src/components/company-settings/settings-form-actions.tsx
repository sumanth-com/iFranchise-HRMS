"use client";

import { Loader2, RotateCcw } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/common/button";
import { StickyPageActions } from "@/components/common/sticky-layout";

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
    <section className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-sm font-medium">{title}</h2>
        {description ? (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function SettingsToggle({
  label,
  disabled,
  ...props
}: { label: string; disabled?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex items-center gap-3 rounded-lg border px-4 py-3 text-sm">
      <input
        type="checkbox"
        className="size-4 rounded border-input"
        disabled={disabled}
        {...props}
      />
      <span>{label}</span>
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
    <div className="space-y-2">
      <label className="text-sm font-medium leading-none">{label}</label>
      {children}
    </div>
  );
}
