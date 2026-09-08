import { Suspense } from "react";

import { AttendanceLocationDetailsView } from "@/components/attendance/attendance-location-details-view";
import { ModulePageSkeleton } from "@/components/layout/module-page-skeleton";
import { getAttendanceLocationAction } from "@/lib/attendance/actions/attendance-location-actions";
import { buttonVariants } from "@/components/common/button";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Props = {
  attendanceId: string;
  attendanceBasePath: string;
  /** Optional `point` query (`in` / `out`) — scopes reverse-geocode to the viewed punch. */
  preferredPoint?: string | null;
  /** Optional outer padding for employee portal pages. */
  padded?: boolean;
};

async function AttendanceLocationContent({
  attendanceId,
  attendanceBasePath,
  preferredPoint,
}: Props) {
  const result = await getAttendanceLocationAction(attendanceId, preferredPoint);

  if (!result.success) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-3 rounded-2xl border bg-card px-6 py-14 text-center shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight">
          {result.code === "forbidden"
            ? "Access denied"
            : result.code === "not_found"
              ? "Record not found"
              : "Unable to load location"}
        </h1>
        <p className="text-sm text-muted-foreground">{result.message}</p>
        <Link
          href={attendanceBasePath}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Back to attendance
        </Link>
      </div>
    );
  }

  return (
    <Suspense fallback={<ModulePageSkeleton />}>
      <AttendanceLocationDetailsView
        data={result.data}
        attendanceBasePath={attendanceBasePath}
      />
    </Suspense>
  );
}

export function AttendanceLocationPageShell({
  attendanceId,
  attendanceBasePath,
  preferredPoint = null,
  padded = false,
}: Props) {
  return (
    <div
      className={cn(
        "min-h-full bg-background",
        padded ? "p-4 md:p-5" : undefined,
      )}
    >
      <Suspense fallback={<ModulePageSkeleton />}>
        <AttendanceLocationContent
          attendanceId={attendanceId}
          attendanceBasePath={attendanceBasePath}
          preferredPoint={preferredPoint}
        />
      </Suspense>
    </div>
  );
}
