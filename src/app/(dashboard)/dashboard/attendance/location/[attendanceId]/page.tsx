import { AttendanceLocationPageShell } from "@/components/attendance/attendance-location-page-shell";
import { SELF_ATTENDANCE_ROUTES } from "@/lib/attendance/constants";

type PageProps = {
  params: Promise<{ attendanceId: string }>;
  searchParams: Promise<{ point?: string }>;
};

export default async function DashboardAttendanceLocationPage({
  params,
  searchParams,
}: PageProps) {
  const { attendanceId } = await params;
  const { point } = await searchParams;
  return (
    <AttendanceLocationPageShell
      attendanceId={attendanceId}
      attendanceBasePath={SELF_ATTENDANCE_ROUTES.list}
      preferredPoint={point ?? null}
    />
  );
}
