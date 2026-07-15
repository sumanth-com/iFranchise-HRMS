"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  CeoBackToDashboard,
  CeoModulePageHeader,
} from "@/components/ceo/ceo-module-primitives";
import { CeoProfileAccountSection } from "@/components/ceo/profile/ceo-profile-account-section";
import { CeoProfileExecutiveSection } from "@/components/ceo/profile/ceo-profile-executive-section";
import {
  CeoProfileActivitySection,
  CeoProfileCalendarSection,
  CeoProfileSecuritySection,
} from "@/components/ceo/profile/ceo-profile-panels";
import {
  CeoProfileNotificationSection,
  CeoProfilePreferencesSection,
} from "@/components/ceo/profile/ceo-profile-preferences-section";
import { Button } from "@/components/common/button";
import {
  downloadCeoProfileAction,
  fetchCeoProfilePageAction,
} from "@/lib/ceo/actions/ceo-profile-actions";
import type { CeoProfilePageData } from "@/types/ceo-profile";

function downloadBase64(filename: string, mimeType: string, contentBase64: string) {
  const binary = atob(contentBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function CeoProfileView(initialData: CeoProfilePageData) {
  const [data, setData] = useState(initialData);
  const [isPending, startTransition] = useTransition();

  const refresh = useCallback(() => {
    startTransition(async () => {
      const next = await fetchCeoProfilePageAction();
      setData(next);
    });
  }, []);

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;
    const el = document.getElementById(hash);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  function downloadProfile() {
    startTransition(async () => {
      const result = await downloadCeoProfileAction();
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      if (result.filename && result.mimeType && result.contentBase64) {
        downloadBase64(result.filename, result.mimeType, result.contentBase64);
      }
      toast.success(result.message);
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-5">
      <CeoBackToDashboard />
      <CeoModulePageHeader
        title="Profile & Settings"
        description="Manage your executive profile, preferences and account settings."
      />

      {isPending ? (
        <p className="text-xs text-muted-foreground">Refreshing profile…</p>
      ) : null}

      <CeoProfileExecutiveSection profile={data.profile} onUpdated={refresh} />
      <CeoProfileAccountSection account={data.account} onUpdated={refresh} />
      <CeoProfilePreferencesSection
        preferences={data.preferences}
        onUpdated={refresh}
      />
      <CeoProfileNotificationSection
        alertPreferences={data.alertPreferences}
        onUpdated={refresh}
      />
      <CeoProfileSecuritySection sessions={data.sessions} onUpdated={refresh} />
      <CeoProfileCalendarSection calendar={data.calendar} />

      <section id="quick-actions" className="rounded-xl border bg-card p-4 shadow-sm md:p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Quick Actions</h2>
          <p className="text-sm text-muted-foreground">
            Jump to common executive account tasks.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="#profile"
            className="inline-flex h-8 items-center rounded-md border border-input bg-background px-3 text-xs font-medium hover:bg-accent"
          >
            Update Profile
          </a>
          <a
            href="#account"
            className="inline-flex h-8 items-center rounded-md border border-input bg-background px-3 text-xs font-medium hover:bg-accent"
          >
            Change Password
          </a>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={downloadProfile}
          >
            Download My Profile
          </Button>
          <a
            href="#activity"
            className="inline-flex h-8 items-center rounded-md border border-input bg-background px-3 text-xs font-medium hover:bg-accent"
          >
            View Audit Logs (Own)
          </a>
          <a
            href="#notifications"
            className="inline-flex h-8 items-center rounded-md border border-input bg-background px-3 text-xs font-medium hover:bg-accent"
          >
            Manage Notification Preferences
          </a>
        </div>
      </section>

      <CeoProfileActivitySection activity={data.activity} />
    </div>
  );
}
