import { AttendanceLocationPageShell } from "@/components/attendance/attendance-location-page-shell";
import { EMPLOYEE_ROUTES } from "@/lib/employee/constants";

type PageProps = {
  params: Promise<{ attendanceId: string }>;
  searchParams: Promise<{ point?: string }>;
};

export default async function EmployeeAttendanceLocationPage({
  params,
  searchParams,
}: PageProps) {
  const { attendanceId } = await params;
  const { point } = await searchParams;
  return (
    <AttendanceLocationPageShell
      attendanceId={attendanceId}
      attendanceBasePath={EMPLOYEE_ROUTES.attendance}
      preferredPoint={point ?? null}
      padded
    />
  );
}
