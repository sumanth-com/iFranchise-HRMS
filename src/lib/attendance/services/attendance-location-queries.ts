import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import {
  buildGpsPoint,
  type AttendanceGpsPoint,
  type AttendanceLocationDetails,
  type AttendanceLocationPointKind,
} from "@/lib/attendance/services/attendance-location";
import {
  addressColumnForPoint,
  reverseGeocodeAttendanceAddress,
} from "@/lib/attendance/services/attendance-reverse-geocode";
import { getManagerTeamScope } from "@/lib/manager/services/team-queries";
import { hasPermission } from "@/lib/permissions/utils";
import { formatCleanEmployeeName } from "@/lib/employees/parse-employee-name";
import type { AttendanceDisplayStatus } from "@/types/attendance";
import type { UserProfile } from "@/types/auth";

type LocationRow = {
  id: string;
  organization_id: string;
  employee_id: string;
  attendance_date: string;
  check_in_at: string | null;
  check_out_at: string | null;
  attendance_status: AttendanceDisplayStatus;
  notes: string | null;
  check_in_latitude: number | string | null;
  check_in_longitude: number | string | null;
  check_in_accuracy_m: number | string | null;
  check_in_address: string | null;
  check_in_location_at: string | null;
  check_out_latitude: number | string | null;
  check_out_longitude: number | string | null;
  check_out_accuracy_m: number | string | null;
  check_out_address: string | null;
  check_out_location_at: string | null;
  employees:
    | {
        employee_code: string;
        first_name: string;
        last_name: string;
      }
    | {
        employee_code: string;
        first_name: string;
        last_name: string;
      }[]
    | null;
};

function unwrapRelation<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export type AttendanceLocationAccessResult =
  | { status: "ok"; data: AttendanceLocationDetails }
  | { status: "not_found" }
  | { status: "forbidden" };

/**
 * Load one attendance GPS view with server-side authorization.
 * - Employee portal: own records only
 * - HR / CEO portal: all records in the same organization
 * - Manager portal: own records + reporting-team records
 */
export async function getAuthorizedAttendanceLocation(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  attendanceId: string,
): Promise<AttendanceLocationAccessResult> {
  const organizationId = profile.employee.organizationId;

  const { data, error } = await supabase
    .schema("hrms")
    .from("attendance")
    .select(
      `
        id,
        organization_id,
        employee_id,
        attendance_date,
        check_in_at,
        check_out_at,
        attendance_status,
        notes,
        check_in_latitude,
        check_in_longitude,
        check_in_accuracy_m,
        check_in_address,
        check_in_location_at,
        check_out_latitude,
        check_out_longitude,
        check_out_accuracy_m,
        check_out_address,
        check_out_location_at,
        employees!inner (
          employee_code,
          first_name,
          last_name
        )
      `,
    )
    .eq("id", attendanceId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return { status: "not_found" };
  }

  const row = data as LocationRow;
  const isOwn = row.employee_id === profile.employee.id;
  const hasHrAccess = hasPermission(profile.permissionCodes, PORTAL_PERMISSIONS.hr);
  const hasCeoAccess = hasPermission(
    profile.permissionCodes,
    PORTAL_PERMISSIONS.ceo,
  );

  // Org-wide location access is limited to HR and CEO portal permissions.
  // Employees never see another employee's location via URL guessing.
  if (!isOwn && !hasHrAccess && !hasCeoAccess) {
    const hasManagerAccess = hasPermission(
      profile.permissionCodes,
      PORTAL_PERMISSIONS.manager,
    );
    if (!hasManagerAccess) {
      return { status: "forbidden" };
    }
    const { teamIds } = await getManagerTeamScope(supabase, profile);
    if (!teamIds.includes(row.employee_id)) {
      return { status: "forbidden" };
    }
  }

  const employee = unwrapRelation(row.employees);
  const checkIn = buildGpsPoint({
    kind: "check_in",
    latitude: row.check_in_latitude,
    longitude: row.check_in_longitude,
    accuracyMeters: row.check_in_accuracy_m,
    address: row.check_in_address,
    recordedAt: row.check_in_location_at,
    notes: row.notes,
    fallbackRecordedAt: row.check_in_at,
  });
  const checkOut = buildGpsPoint({
    kind: "check_out",
    latitude: row.check_out_latitude,
    longitude: row.check_out_longitude,
    accuracyMeters: row.check_out_accuracy_m,
    address: row.check_out_address,
    recordedAt: row.check_out_location_at,
    fallbackRecordedAt: row.check_out_at,
  });

  return {
    status: "ok",
    data: {
      attendanceId: row.id,
      employeeId: row.employee_id,
      employeeName: employee
        ? formatCleanEmployeeName(employee.first_name, employee.last_name)
        : "Employee",
      employeeCode: employee?.employee_code ?? "",
      attendanceDate: row.attendance_date,
      attendanceStatus: row.attendance_status,
      checkInAt: row.check_in_at,
      checkOutAt: row.check_out_at,
      checkIn,
      checkOut,
    },
  };
}

export function pickLocationPoint(
  details: AttendanceLocationDetails,
  preferred?: AttendanceLocationPointKind | null,
) {
  if (preferred === "check_out" && details.checkOut) return details.checkOut;
  if (preferred === "check_in" && details.checkIn) return details.checkIn;
  return details.checkIn ?? details.checkOut ?? null;
}

/**
 * Resolve and cache missing human-readable addresses for GPS points.
 * Updates only address text columns — never touches punch times/status/hours.
 *
 * When `preferred` is set, only that punch point is geocoded (avoids extra
 * Nominatim calls). Otherwise both missing addresses are filled, with ≥1.1s
 * spacing to respect Nominatim usage policy.
 */
export async function enrichAttendanceLocationAddresses(
  supabase: AuthSupabaseClient,
  details: AttendanceLocationDetails,
  preferred?: AttendanceLocationPointKind | null,
): Promise<AttendanceLocationDetails> {
  // Only call Nominatim for points that need an address.
  const needIn =
    (preferred == null || preferred === "check_in") &&
    Boolean(details.checkIn && !details.checkIn.address?.trim());
  const needOut =
    (preferred == null || preferred === "check_out") &&
    Boolean(details.checkOut && !details.checkOut.address?.trim());

  let nextCheckIn = details.checkIn;
  let nextCheckOut = details.checkOut;

  if (needIn) {
    nextCheckIn = await resolveAndCachePointAddress(
      supabase,
      details.attendanceId,
      details.checkIn,
    );
  }

  if (needOut) {
    if (needIn) {
      await new Promise((resolve) => setTimeout(resolve, 1_100));
    }
    nextCheckOut = await resolveAndCachePointAddress(
      supabase,
      details.attendanceId,
      details.checkOut,
    );
  }

  if (nextCheckIn === details.checkIn && nextCheckOut === details.checkOut) {
    return details;
  }

  return {
    ...details,
    checkIn: nextCheckIn,
    checkOut: nextCheckOut,
  };
}

async function resolveAndCachePointAddress(
  supabase: AuthSupabaseClient,
  attendanceId: string,
  point: AttendanceGpsPoint | null,
): Promise<AttendanceGpsPoint | null> {
  if (!point) return null;
  if (point.address?.trim()) return point;

  const address = await reverseGeocodeAttendanceAddress(
    point.latitude,
    point.longitude,
  );
  if (!address) return point;

  const column = addressColumnForPoint(point.kind);
  const { error } = await supabase
    .schema("hrms")
    .from("attendance")
    .update({ [column]: address })
    .eq("id", attendanceId)
    .is("deleted_at", null)
    .is(column, null);

  if (error) {
    // Still return resolved address for this page view even if cache write fails.
    console.error(
      "[enrichAttendanceLocationAddresses] failed to cache address",
      error.message,
    );
  }

  return { ...point, address };
}
