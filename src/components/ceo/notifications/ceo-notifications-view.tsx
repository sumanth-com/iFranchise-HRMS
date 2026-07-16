"use client";

import { useCallback, useState, useTransition } from "react";

import {
  CeoBackToDashboard,
  CeoModulePageHeader,
} from "@/components/ceo/ceo-module-primitives";
import { CeoNotificationsInbox } from "@/components/ceo/notifications/ceo-notifications-inbox";
import { CeoNotificationsSummary } from "@/components/ceo/notifications/ceo-notifications-summary";
import { Button } from "@/components/common/button";
import {
  fetchCeoNotificationsPageAction,
  markAllCeoNotificationsReadAction,
} from "@/lib/ceo/actions/ceo-notifications-actions";
import type {
  CeoNotificationListParams,
  CeoNotificationsPageData,
} from "@/types/ceo-notifications";

type Props = CeoNotificationsPageData & {
  initialFilters: CeoNotificationListParams;
};

export function CeoNotificationsView({
  kpis: initialKpis,
  list: initialList,
  initialFilters,
}: Props) {
  const [kpis, setKpis] = useState(initialKpis);
  const [list, setList] = useState(initialList);
  const [filters, setFilters] = useState<CeoNotificationListParams>(initialFilters);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const refresh = useCallback((nextFilters: CeoNotificationListParams) => {
    startTransition(async () => {
      const data = await fetchCeoNotificationsPageAction(nextFilters);
      setKpis(data.kpis);
      setList(data.list);
    });
  }, []);

  function onMarkAllRead() {
    startTransition(async () => {
      const result = await markAllCeoNotificationsReadAction();
      setActionMessage(result.message);
      if (result.success) refresh(filters);
    });
  }

  return (
    <div className="flex w-full min-h-0 flex-1 flex-col gap-3 overflow-y-auto scroll-smooth p-3 pb-8 md:gap-4 md:p-4 md:pb-10 lg:p-5">
      <CeoBackToDashboard />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <CeoModulePageHeader
          title="Notifications"
          description="Executive alerts, approvals, and company updates that need your attention."
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          disabled={isPending || kpis.unread === 0}
          onClick={onMarkAllRead}
        >
          Mark all read
        </Button>
      </div>

      <CeoNotificationsSummary kpis={kpis} />

      {actionMessage ? (
        <p className="text-sm text-muted-foreground">{actionMessage}</p>
      ) : null}

      <CeoNotificationsInbox
        rows={list.data}
        total={list.total}
        page={list.page}
        pageSize={list.pageSize}
        isLoading={isPending}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onPageChange={(page) => {
          const next = { ...filters, page };
          setFilters(next);
          refresh(next);
        }}
        onChanged={() => refresh(filters)}
      />
    </div>
  );
}
