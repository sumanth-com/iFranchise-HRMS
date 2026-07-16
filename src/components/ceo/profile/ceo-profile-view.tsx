"use client";

import { useCallback, useState, useTransition } from "react";

import {
  CeoBackToDashboard,
  CeoModulePageHeader,
} from "@/components/ceo/ceo-module-primitives";
import { CeoProfileAccountSection } from "@/components/ceo/profile/ceo-profile-account-section";
import { CeoProfileIdCard } from "@/components/ceo/profile/ceo-profile-id-card";
import {
  CeoProfileNotificationSection,
  CeoProfilePreferencesSection,
} from "@/components/ceo/profile/ceo-profile-preferences-section";
import { fetchCeoProfilePageAction } from "@/lib/ceo/actions/ceo-profile-actions";
import type { CeoProfilePageData } from "@/types/ceo-profile";

export function CeoProfileView(initialData: CeoProfilePageData) {
  const [data, setData] = useState(initialData);
  const [isPending, startTransition] = useTransition();

  const refresh = useCallback(() => {
    startTransition(async () => {
      const next = await fetchCeoProfilePageAction();
      setData(next);
    });
  }, []);

  return (
    <div className="flex w-full min-h-0 flex-1 flex-col gap-3 overflow-y-auto scroll-smooth p-3 pb-8 md:gap-4 md:p-4 md:pb-10 lg:p-5">
      <CeoBackToDashboard />
      <CeoModulePageHeader
        title="Profile & Settings"
        description="Your executive identity, security, and day-to-day portal preferences."
      />

      {isPending ? (
        <p className="text-xs text-muted-foreground">Refreshing…</p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,18.5rem)] lg:items-start">
        <div className="order-2 flex min-w-0 flex-col gap-3 md:gap-4 lg:order-1">
          <CeoProfileAccountSection
            account={data.account}
            onUpdated={refresh}
          />
          <CeoProfileNotificationSection
            alertPreferences={data.alertPreferences}
            preferences={data.preferences}
            onUpdated={refresh}
          />
          <CeoProfilePreferencesSection
            preferences={data.preferences}
            onUpdated={refresh}
          />
        </div>

        <div className="order-1 flex w-full justify-center lg:sticky lg:top-4 lg:order-2 lg:justify-end">
          <CeoProfileIdCard
            profile={data.profile}
            className="h-[30rem] w-full max-w-[18.5rem]"
          />
        </div>
      </div>
    </div>
  );
}
