import Link from "next/link";

import { AttendanceForm } from "@/components/attendance/attendance-form";
import { buttonVariants } from "@/components/common/button";
import { createClient } from "@/lib/supabase/server";
import { getAttendanceLookups } from "@/lib/attendance/services/attendance-queries";
import { attendanceTeamListUrl } from "@/lib/attendance/constants";
import { requireServerPermission } from "@/lib/permissions/server";
import { cn } from "@/lib/utils";

export default async function NewAttendancePage() {
  const profile = await requireServerPermission("attendance.create");
  const supabase = await createClient();
  const lookups = await getAttendanceLookups(
    supabase,
    profile.employee.organizationId,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Add attendance
          </h1>
          <p className="text-sm text-muted-foreground">
            Create a manual attendance record for an employee.
          </p>
        </div>
        <Link
          href={attendanceTeamListUrl()}
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Cancel
        </Link>
      </div>

      <div className="rounded-xl border bg-card p-5 sm:p-6">
        <AttendanceForm mode="create" lookups={lookups} />
      </div>
    </div>
  );
}
