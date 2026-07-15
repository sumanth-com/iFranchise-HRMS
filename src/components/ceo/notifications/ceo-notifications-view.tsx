"use client";

import { useCallback, useRef, useState, useTransition } from "react";

import {
  CeoBackToDashboard,
  CeoModulePageHeader,
} from "@/components/ceo/ceo-module-primitives";
import { CeoNotificationsCategories } from "@/components/ceo/notifications/ceo-notifications-categories";
import { CeoNotificationsDrawer } from "@/components/ceo/notifications/ceo-notifications-drawer";
import { CeoNotificationsFilters } from "@/components/ceo/notifications/ceo-notifications-filters";
import {
  CeoNotificationsAlerts,
  CeoNotificationsAnnouncements,
} from "@/components/ceo/notifications/ceo-notifications-panels";
import { CeoNotificationsSummary } from "@/components/ceo/notifications/ceo-notifications-summary";
import { CeoNotificationsTable } from "@/components/ceo/notifications/ceo-notifications-table";
import { Button } from "@/components/common/button";
import {
  archiveCeoNotificationAction,
  fetchCeoNotificationsPageAction,
  markAllCeoNotificationsReadAction,
  markCeoNotificationReadAction,
} from "@/lib/ceo/actions/ceo-notifications-actions";
import type {
  CeoNotificationListParams,
  CeoNotificationsPageData,
} from "@/types/ceo-notifications";

type Props = CeoNotificationsPageData & {
  initialFilters: CeoNotificationListParams;
};

function defaultFilters(): CeoNotificationListParams {
  return { page: 1, pageSize: 15 };
}

export function CeoNotificationsView({
  kpis: initialKpis,
  categories: initialCategories,
  list: initialList,
  alerts: initialAlerts,
  announcements: initialAnnouncements,
  lookups,
  initialFilters,
}: Props) {
  const [kpis, setKpis] = useState(initialKpis);
  const [categories, setCategories] = useState(initialCategories);
  const [list, setList] = useState(initialList);
  const [alerts, setAlerts] = useState(initialAlerts);
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [filters, setFilters] = useState<CeoNotificationListParams>(initialFilters);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const searchTimerRef = useRef<number | null>(null);

  const refresh = useCallback((nextFilters: CeoNotificationListParams) => {
    startTransition(async () => {
      const data = await fetchCeoNotificationsPageAction(nextFilters);
      setKpis(data.kpis);
      setCategories(data.categories);
      setList(data.list);
      setAlerts(data.alerts);
      setAnnouncements(data.announcements);
    });
  }, []);

  function updateFilters(next: Partial<CeoNotificationListParams>) {
    const merged = { ...filters, ...next };
    setFilters(merged);
    if ("search" in next) {
      if (searchTimerRef.current) window.clearTimeout(searchTimerRef.current);
      searchTimerRef.current = window.setTimeout(() => refresh(merged), 250);
      return;
    }
    refresh(merged);
  }

  function resetFilters() {
    const next = defaultFilters();
    setFilters(next);
    refresh(next);
  }

  function openDetails(id: string) {
    setSelectedId(id);
    setDrawerOpen(true);
  }

  function onMarkRead(id: string) {
    startTransition(async () => {
      const result = await markCeoNotificationReadAction({ notificationId: id });
      setActionMessage(result.message);
      if (result.success) refresh(filters);
    });
  }

  function onArchive(id: string) {
    startTransition(async () => {
      const result = await archiveCeoNotificationAction({ notificationId: id });
      setActionMessage(result.message);
      if (result.success) refresh(filters);
    });
  }

  function onMarkAllRead() {
    startTransition(async () => {
      const result = await markAllCeoNotificationsReadAction();
      setActionMessage(result.message);
      if (result.success) refresh(filters);
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-5">
      <CeoBackToDashboard />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <CeoModulePageHeader
          title="Notifications"
          description="Monitor executive alerts, approvals, company events and critical business updates."
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending || kpis.unread === 0}
          onClick={onMarkAllRead}
        >
          Mark all read
        </Button>
      </div>

      <CeoNotificationsSummary kpis={kpis} />

      <CeoNotificationsFilters
        filters={filters}
        lookups={lookups}
        onChange={updateFilters}
        onReset={resetFilters}
        disabled={isPending}
      />

      <CeoNotificationsCategories
        categories={categories}
        activeCategory={filters.category}
        onSelect={(category) => updateFilters({ category, page: 1 })}
      />

      {actionMessage ? (
        <p className="text-sm text-muted-foreground">{actionMessage}</p>
      ) : null}

      <CeoNotificationsTable
        rows={list.data}
        total={list.total}
        page={list.page}
        pageSize={list.pageSize}
        isLoading={isPending}
        onPageChange={(page) => updateFilters({ page })}
        onView={openDetails}
        onMarkRead={onMarkRead}
        onArchive={onArchive}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <CeoNotificationsAlerts alerts={alerts} onView={openDetails} />
        <CeoNotificationsAnnouncements
          announcements={announcements}
          onView={openDetails}
        />
      </div>

      <CeoNotificationsDrawer
        notificationId={selectedId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onChanged={() => refresh(filters)}
      />
    </div>
  );
}
