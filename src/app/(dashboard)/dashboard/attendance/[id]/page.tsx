import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AttendanceDetailView } from "@/components/attendance/attendance-detail-view";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { buttonVariants } from "@/components/common/button";
import { getAttendanceDetailAction } from "@/lib/attendance/actions";
import { ATTENDANCE_ROUTES } from "@/lib/attendance/constants";
import { requireServerPermission } from "@/lib/permissions/server";
import { hasPermission } from "@/lib/permissions/utils";
import { cn } from "@/lib/utils";

type AttendanceDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AttendanceDetailPage({
  params,
}: AttendanceDetailPageProps) {
  const profile = await requireServerPermission("attendance.view");
  const { id } = await params;
  const result = await getAttendanceDetailAction(id);

  if (!result.success || !result.data) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Link
        href={ATTENDANCE_ROUTES.list}
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "px-0")}
      >
        ← Back to attendance
      </Link>

      <Suspense
        fallback={
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        }
      >
        <AttendanceDetailView
          attendance={result.data}
          canEdit={hasPermission(profile.permissionCodes, "attendance.edit")}
        />
      </Suspense>
    </div>
  );
}
