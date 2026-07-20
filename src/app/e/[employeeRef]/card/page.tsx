import { notFound, redirect } from "next/navigation";

import { EmployeeAttendanceScanCard } from "@/components/employee/attendance/employee-attendance-scan-card";
import { getEmployeeAttendanceCardSnapshot } from "@/lib/employee/services/employee-attendance-card-queries";
import { requireAuthenticatedProfile } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ employeeRef: string }>;
};

export default async function EmployeeAttendanceCardScanPage({ params }: PageProps) {
  const { employeeRef } = await params;
  const profile = await requireAuthenticatedProfile();
  const supabase = await createClient();

  const result = await getEmployeeAttendanceCardSnapshot(
    supabase,
    profile,
    employeeRef,
  );

  if (!result) {
    notFound();
  }

  if (employeeRef !== result.canonicalRef) {
    redirect(`/e/${result.canonicalRef}/card`);
  }

  return <EmployeeAttendanceScanCard snapshot={result.snapshot} />;
}
