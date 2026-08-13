"use client";

import { useCallback, useState, useTransition } from "react";

import { CeoProfileExecutiveSection } from "@/components/ceo/profile/ceo-profile-executive-section";
import { CeoProfileIdCard } from "@/components/ceo/profile/ceo-profile-id-card";
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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your executive identity and contact details. Account security is under Settings.
        </p>
      </div>

      {isPending ? (
        <p className="text-xs text-muted-foreground">Refreshing…</p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,18.5rem)] lg:items-start">
        <div className="order-2 flex min-w-0 flex-col gap-3 md:gap-4 lg:order-1">
          <CeoProfileExecutiveSection profile={data.profile} onUpdated={refresh} />
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
