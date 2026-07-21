"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ManagerAttendanceCalendar } from "@/components/manager/profile/manager-attendance-calendar";
import { ManagerProfileHistoryTable } from "@/components/manager/profile/manager-profile-history-table";
import { ManagerProfileIdCard } from "@/components/manager/profile/manager-profile-id-card";
import { ManagerProfileSummaryCards } from "@/components/manager/profile/manager-profile-summary-cards";
import { ManagerProfileTodayCard } from "@/components/manager/profile/manager-profile-today-card";
import type { AttendanceStatus } from "@/types/attendance";
import type { ManagerProfilePageData } from "@/types/manager-self-attendance";

type Props = {
  data: ManagerProfilePageData;
  status?: AttendanceStatus;
  searchDate?: string;
};

export function ManagerProfileView({ data, status, searchDate }: Props) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<string | null>(
    data.selectedDate,
  );

  function pushParams(next: {
    month: number;
    year: number;
    date?: string | null;
    status?: AttendanceStatus;
    searchDate?: string;
    page?: number;
  }) {
    const params = new URLSearchParams();
    params.set("month", String(next.month));
    params.set("year", String(next.year));
    if (next.date) params.set("date", next.date);
    if (next.status) params.set("status", next.status);
    if (next.searchDate) params.set("searchDate", next.searchDate);
    if (next.page && next.page > 1) params.set("page", String(next.page));
    router.push(`/manager/profile?${params.toString()}`);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-4 md:p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Attendance</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your personal attendance, identity, and regularization requests.
          </p>
        </div>

        <ManagerProfileTodayCard today={data.today} />

        <div className="grid gap-4 xl:min-h-[min(32rem,calc(100dvh-16rem))] xl:grid-cols-[minmax(0,1.4fr)_minmax(16rem,18.5rem)] xl:items-stretch">
          <ManagerAttendanceCalendar
            days={data.calendarDays}
            month={data.month}
            year={data.year}
            selectedDate={selectedDate}
            onMonthChange={(month, year) =>
              pushParams({
                month,
                year,
                date: selectedDate,
                status,
                searchDate,
              })
            }
            onSelectDate={(date) => {
              setSelectedDate(date);
              pushParams({
                month: data.month,
                year: data.year,
                date,
                status,
                searchDate,
              });
            }}
          />
          <div className="flex h-full min-h-[28rem] w-full justify-center xl:justify-end">
            <ManagerProfileIdCard
              profile={data.profileCard}
              className="h-full min-h-[28rem] w-full max-w-[18.5rem]"
            />
          </div>
        </div>

        <ManagerProfileSummaryCards summary={data.summary} />

        <ManagerProfileHistoryTable
          history={data.history}
          month={data.month}
          year={data.year}
          status={status}
          searchDate={searchDate}
          onFilterChange={(filters) =>
            pushParams({
              month: filters.month,
              year: filters.year,
              date: selectedDate,
              status: filters.status,
              searchDate: filters.searchDate,
              page: filters.page,
            })
          }
        />
      </div>
    </div>
  );
}
