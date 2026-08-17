"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";

import { AttendanceDetailView } from "@/components/attendance/attendance-detail-view";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { getAttendanceDetailAction } from "@/lib/attendance/actions";
import type { AttendanceDetail } from "@/types/attendance";

type CeoAttendanceRecordDrawerProps = {
  attendanceId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CeoAttendanceRecordDrawer({
  attendanceId,
  open,
  onOpenChange,
}: CeoAttendanceRecordDrawerProps) {
  const [detail, setDetail] = useState<AttendanceDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || !attendanceId) {
      setDetail(null);
      setError(null);
      return;
    }

    startTransition(async () => {
      const result = await getAttendanceDetailAction(attendanceId);
      if (!result.success) {
        setDetail(null);
        setError(result.message);
        return;
      }
      setError(null);
      setDetail(result.data);
    });
  }, [open, attendanceId]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Attendance record</SheetTitle>
        </SheetHeader>

        {isPending ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <p className="px-1 py-6 text-sm text-muted-foreground">{error}</p>
        ) : detail ? (
          <AttendanceDetailView attendance={detail} canEdit={false} />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
