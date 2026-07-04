import Link from "next/link";
import { notFound } from "next/navigation";

import { AttendanceForm } from "@/components/attendance/attendance-form";
import { buttonVariants } from "@/components/common/button";
import { createClient } from "@/lib/supabase/server";
import { getAttendanceById } from "@/lib/attendance/services/attendance-detail";
import { getAttendanceLookups } from "@/lib/attendance/services/attendance-queries";
import { ATTENDANCE_ROUTES } from "@/lib/attendance/constants";
import { requireServerPermission } from "@/lib/permissions/server";
import { cn } from "@/lib/utils";

type AttendanceEditPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AttendanceEditPage({
  params,
}: AttendanceEditPageProps) {
  const profile = await requireServerPermission("attendance.edit");
  const { id } = await params;
  const supabase = await createClient();

  const [attendance, lookups] = await Promise.all([
    getAttendanceById(supabase, profile, id),
    getAttendanceLookups(supabase, profile.employee.organizationId),
  ]);

  if (!attendance) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Edit attendance
          </h1>
          <p className="text-sm text-muted-foreground">
            Update attendance for {attendance.employeeName} on{" "}
            {attendance.attendanceDate}.
          </p>
        </div>
        <Link
          href={ATTENDANCE_ROUTES.detail(attendance.id)}
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Cancel
        </Link>
      </div>

      <div className="rounded-xl border bg-card p-5 sm:p-6">
        <AttendanceForm mode="edit" attendance={attendance} lookups={lookups} />
      </div>
    </div>
  );
}
