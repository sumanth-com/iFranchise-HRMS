import { AttendanceLocationPageShell } from "@/components/attendance/attendance-location-page-shell";
import { CEO_ROUTES } from "@/lib/ceo/constants";

type PageProps = {
  params: Promise<{ attendanceId: string }>;
  searchParams: Promise<{ point?: string }>;
};

export default async function CeoAttendanceLocationPage({
  params,
  searchParams,
}: PageProps) {
  const { attendanceId } = await params;
  const { point } = await searchParams;
  return (
    <AttendanceLocationPageShell
      attendanceId={attendanceId}
      attendanceBasePath={CEO_ROUTES.attendance}
      preferredPoint={point ?? null}
      padded
    />
  );
}
