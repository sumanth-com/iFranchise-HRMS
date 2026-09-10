import { AttendanceLocationPageShell } from "@/components/attendance/attendance-location-page-shell";
import { ACCOUNTANT_ROUTES } from "@/lib/accountant/constants";

type PageProps = {
  params: Promise<{ attendanceId: string }>;
  searchParams: Promise<{ point?: string }>;
};

export default async function AccountantAttendanceLocationPage({
  params,
  searchParams,
}: PageProps) {
  const { attendanceId } = await params;
  const { point } = await searchParams;
  return (
    <AttendanceLocationPageShell
      attendanceId={attendanceId}
      attendanceBasePath={ACCOUNTANT_ROUTES.attendance}
      preferredPoint={point ?? null}
      padded
    />
  );
}
