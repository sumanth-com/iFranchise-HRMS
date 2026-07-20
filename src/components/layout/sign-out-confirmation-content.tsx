"use client";

import { AlertTriangle, CheckCircle2, LogOut } from "lucide-react";

import { useUnsavedChanges } from "@/providers/unsaved-changes-provider";

const SAVED_ITEMS = [
  "Submitted attendance, leave, and payroll records",
  "Profile details and uploaded documents on the server",
  "Settings and preferences you have already saved",
] as const;

export function SignOutConfirmationContent() {
  const { items: unsavedItems } = useUnsavedChanges();
  const hasUnsavedChanges = unsavedItems.length > 0;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3.5 py-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <p className="text-sm font-medium text-foreground">Saved and secure</p>
        </div>
        <ul className="mt-2.5 space-y-1.5 pl-6 text-sm text-muted-foreground">
          {SAVED_ITEMS.map((item) => (
            <li key={item} className="list-disc">
              {item}
            </li>
          ))}
        </ul>
      </div>

      {hasUnsavedChanges ? (
        <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-3.5 py-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-sm font-medium text-foreground">Unsaved changes detected</p>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            The following updates have not been saved yet. Please save them before signing out,
            or they will be discarded.
          </p>
          <ul className="mt-2.5 space-y-1.5 pl-6 text-sm font-medium text-foreground">
            {unsavedItems.map((item) => (
              <li key={item.id} className="list-disc">
                {item.label}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="rounded-lg border bg-muted/30 px-3.5 py-3 text-sm text-muted-foreground">
          No unsaved changes were detected on this page. You can sign out safely.
        </div>
      )}

      <div className="flex items-start gap-2 rounded-lg border border-dashed px-3.5 py-3 text-sm text-muted-foreground">
        <LogOut className="mt-0.5 size-4 shrink-0" />
        <p>
          Signing out will end your current session. You will need to sign in again to access
          your account.
        </p>
      </div>
    </div>
  );
}
