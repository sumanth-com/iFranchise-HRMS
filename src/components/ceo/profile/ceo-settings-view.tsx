"use client";

import { useCallback, useState, useTransition } from "react";

import { CeoProfileAccountSection } from "@/components/ceo/profile/ceo-profile-account-section";
import {
  CeoProfileNotificationSection,
  CeoProfilePreferencesSection,
} from "@/components/ceo/profile/ceo-profile-preferences-section";
import { fetchCeoProfilePageAction } from "@/lib/ceo/actions/ceo-profile-actions";
import type { CeoProfilePageData } from "@/types/ceo-profile";

export function CeoSettingsView(initialData: CeoProfilePageData) {
  const [data, setData] = useState(initialData);
  const [isPending, startTransition] = useTransition();

  const refresh = useCallback(() => {
    startTransition(async () => {
      const next = await fetchCeoProfilePageAction();
      setData(next);
    });
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 md:p-5">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage appearance, notifications, and account security. Personal profile is
            under My Profile in the sidebar.
          </p>
        </div>

        {isPending ? (
          <p className="text-xs text-muted-foreground">Refreshing…</p>
        ) : null}

        <CeoProfilePreferencesSection
          preferences={data.preferences}
          onUpdated={refresh}
        />
        <CeoProfileAccountSection account={data.account} onUpdated={refresh} />
        <CeoProfileNotificationSection
          alertPreferences={data.alertPreferences}
          preferences={data.preferences}
          onUpdated={refresh}
        />
      </div>
    </div>
  );
}
