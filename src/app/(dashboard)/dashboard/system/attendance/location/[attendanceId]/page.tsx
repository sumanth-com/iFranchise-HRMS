import { AttendanceLocationPageShell } from "@/components/attendance/attendance-location-page-shell";
import { SYSTEM_ADMIN_ROUTES } from "@/lib/system-admin/constants";

type PageProps = {
  params: Promise<{ attendanceId: string }>;
  searchParams: Promise<{ point?: string }>;
};

export default async function SystemAttendanceLocationPage({
  params,
  searchParams,
}: PageProps) {
  const { attendanceId } = await params;
  const { point } = await searchParams;
  return (
    <AttendanceLocationPageShell
      attendanceId={attendanceId}
      attendanceBasePath={SYSTEM_ADMIN_ROUTES.attendance}
      preferredPoint={point ?? null}
    />
  );
}
