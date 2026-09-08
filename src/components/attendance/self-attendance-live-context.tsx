"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import { useLiveWorkingSeconds } from "@/hooks/use-live-working-seconds";
import {
  averageApplicableWorkingHours,
  averageApplicableWorkingSeconds,
  formatWorkingDuration,
} from "@/lib/employee/attendance-format";
import type {
  ManagerAttendanceCalendarDay,
  ManagerTodayAttendance,
} from "@/types/manager-self-attendance";

function punchRank(today: ManagerTodayAttendance) {
  if (today.checkOutAt) return 2;
  if (today.checkInAt) return 1;
  return 0;
}

function preferFresherToday(
  local: ManagerTodayAttendance,
  server: ManagerTodayAttendance,
) {
  // Prefer whichever side has the more advanced punch lifecycle.
  if (punchRank(server) > punchRank(local)) return server;
  if (punchRank(local) > punchRank(server)) return local;

  // Same punch rank: prefer the side that already has location flags / attendance id.
  const serverScore =
    (server.attendanceId ? 1 : 0) +
    (server.hasCheckInLocation ? 1 : 0) +
    (server.hasCheckOutLocation ? 1 : 0);
  const localScore =
    (local.attendanceId ? 1 : 0) +
    (local.hasCheckInLocation ? 1 : 0) +
    (local.hasCheckOutLocation ? 1 : 0);
  if (serverScore >= localScore) return server;
  return local;
}

function overlayTodayOnCalendar(
  days: ManagerAttendanceCalendarDay[],
  today: ManagerTodayAttendance,
): ManagerAttendanceCalendarDay[] {
  if (!days.length) return days;
  return days.map((day) => {
    if (!day.isToday) return day;
    return {
      ...day,
      status: today.attendanceStatus ?? day.status,
      attendanceId: today.attendanceId ?? day.attendanceId,
      checkInAt: today.checkInAt,
      checkOutAt: today.checkOutAt,
      workHours: today.workHours,
    };
  });
}

type SelfAttendanceLiveValue = {
  today: ManagerTodayAttendance;
  calendarDays: ManagerAttendanceCalendarDay[];
  workingSeconds: number;
  workingHoursLabel: string;
  averageWorkingHours: number;
  averageWorkingSeconds: number;
  applyToday: (today: ManagerTodayAttendance) => void;
  refreshInBackground: () => void;
};

const SelfAttendanceLiveContext = createContext<SelfAttendanceLiveValue | null>(
  null,
);

export function SelfAttendanceLiveProvider({
  today: serverToday,
  calendarDays: serverCalendarDays = [],
  children,
}: {
  today: ManagerTodayAttendance;
  calendarDays?: ManagerAttendanceCalendarDay[];
  children: ReactNode;
}) {
  const router = useRouter();
  const [today, setToday] = useState(serverToday);

  useEffect(() => {
    setToday((local) => preferFresherToday(local, serverToday));
  }, [serverToday]);

  const workingSeconds = useLiveWorkingSeconds(today.checkInAt, today.checkOutAt);
  const calendarDays = useMemo(
    () => overlayTodayOnCalendar(serverCalendarDays, today),
    [serverCalendarDays, today],
  );
  const averageWorkingSeconds = useMemo(
    () =>
      averageApplicableWorkingSeconds(
        calendarDays,
        today.checkOutAt ? undefined : workingSeconds,
      ),
    [calendarDays, today.checkOutAt, workingSeconds],
  );
  const averageWorkingHours = useMemo(
    () => averageApplicableWorkingHours(
      calendarDays,
      today.checkOutAt ? undefined : workingSeconds,
    ),
    [calendarDays, today.checkOutAt, workingSeconds],
  );

  const value = useMemo<SelfAttendanceLiveValue>(
    () => ({
      today,
      calendarDays,
      workingSeconds,
      workingHoursLabel: formatWorkingDuration(workingSeconds),
      averageWorkingHours,
      averageWorkingSeconds,
      applyToday: setToday,
      refreshInBackground: () => router.refresh(),
    }),
    [today, calendarDays, workingSeconds, averageWorkingHours, averageWorkingSeconds, router],
  );

  return (
    <SelfAttendanceLiveContext.Provider value={value}>
      {children}
    </SelfAttendanceLiveContext.Provider>
  );
}

export function useSelfAttendanceLive() {
  const value = useContext(SelfAttendanceLiveContext);
  if (!value) {
    throw new Error("useSelfAttendanceLive must be used within SelfAttendanceLiveProvider");
  }
  return value;
}

export function useOptionalSelfAttendanceLive() {
  return useContext(SelfAttendanceLiveContext);
}
