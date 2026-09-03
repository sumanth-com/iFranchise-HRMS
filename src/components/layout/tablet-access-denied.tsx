"use client";

import { MonitorSmartphone } from "lucide-react";

import { Button } from "@/components/common/button";
import { logoutAction } from "@/lib/auth/actions";

export function TabletAccessDenied() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-10">
      <div className="w-full max-w-md rounded-xl border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
          <MonitorSmartphone className="size-6 text-muted-foreground" aria-hidden />
        </div>
        <h1 className="text-lg font-semibold tracking-tight">Tablet access is not enabled</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tablet access is not enabled for Employee Self-Service. You can still
          sign in on a desktop computer, or ask HR to enable tablet access.
        </p>
        <form action={logoutAction} className="mt-6">
          <Button type="submit" variant="outline">
            Sign out
          </Button>
        </form>
      </div>
    </div>
  );
}
