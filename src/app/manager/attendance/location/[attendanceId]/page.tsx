import { AttendanceLocationPageShell } from "@/components/attendance/attendance-location-page-shell";
import { MANAGER_ROUTES } from "@/lib/manager/constants";

type PageProps = {
  params: Promise<{ attendanceId: string }>;
  searchParams: Promise<{ point?: string }>;
};

export default async function ManagerAttendanceLocationPage({
  params,
  searchParams,
}: PageProps) {
  const { attendanceId } = await params;
  const { point } = await searchParams;
  return (
    <AttendanceLocationPageShell
      attendanceId={attendanceId}
      attendanceBasePath={MANAGER_ROUTES.attendance}
      preferredPoint={point ?? null}
      padded
    />
  );
}
