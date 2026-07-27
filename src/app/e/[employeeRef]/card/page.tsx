import { notFound, redirect } from "next/navigation";

import { EmployeeAttendanceScanCard } from "@/components/employee/attendance/employee-attendance-scan-card";
import { getPublicEmployeeAttendanceCardSnapshot } from "@/lib/employee/services/public-employee-scan-queries";

type PageProps = {
  params: Promise<{ employeeRef: string }>;
};

export default async function EmployeeAttendanceCardScanPage({ params }: PageProps) {
  const { employeeRef } = await params;

  const result = await getPublicEmployeeAttendanceCardSnapshot(employeeRef);

  if (!result) {
    notFound();
  }

  if (employeeRef !== result.canonicalRef) {
    redirect(`/e/${result.canonicalRef}/card`);
  }

  return <EmployeeAttendanceScanCard snapshot={result.snapshot} />;
}
