import { ExportsSchedulesManagement } from "@/components/reports/exports-schedules-management";
import {
  listReportSchedules,
  listScheduleRuns,
} from "@/lib/reports/services/reports-schedules";
import { requireServerPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

export default async function ReportsExportsPage() {
  const profile = await requireServerPermission("reports.view");
  const supabase = await createClient();
  const [schedules, runs] = await Promise.all([
    listReportSchedules(supabase, profile),
    listScheduleRuns(supabase, profile),
  ]);

  return (
    <ExportsSchedulesManagement
      schedules={schedules}
      runs={runs}
      permissionCodes={profile.permissionCodes}
    />
  );
}
