"use server";

import {
  enrichAttendanceLocationAddresses,
  getAuthorizedAttendanceLocation,
} from "@/lib/attendance/services/attendance-location-queries";
import type {
  AttendanceLocationDetails,
  AttendanceLocationPointKind,
} from "@/lib/attendance/services/attendance-location";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

type AttendanceLocationActionResult =
  | { success: true; data: AttendanceLocationDetails }
  | { success: false; message: string; code: "not_found" | "forbidden" | "error" };

function isNextRedirectError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    String((error as { digest: string }).digest).startsWith("NEXT_REDIRECT")
  );
}

function parsePreferredPoint(
  value?: string | null,
): AttendanceLocationPointKind | null {
  if (value === "check_in" || value === "in") return "check_in";
  if (value === "check_out" || value === "out") return "check_out";
  return null;
}

export async function getAttendanceLocationAction(
  attendanceId: string,
  preferredPoint?: string | null,
): Promise<AttendanceLocationActionResult> {
  try {
    const profile = await requireServerAnyPermission([
      "attendance.view",
      PORTAL_PERMISSIONS.employee,
      PORTAL_PERMISSIONS.manager,
      PORTAL_PERMISSIONS.hr,
      PORTAL_PERMISSIONS.ceo,
    ]);
    const supabase = await createClient();
    const result = await getAuthorizedAttendanceLocation(
      supabase,
      profile,
      attendanceId,
    );

    if (result.status === "not_found") {
      return {
        success: false,
        message: "Attendance record not found.",
        code: "not_found",
      };
    }
    if (result.status === "forbidden") {
      return {
        success: false,
        message: "You do not have permission to view this attendance location.",
        code: "forbidden",
      };
    }

    const preferred = parsePreferredPoint(preferredPoint);
    const data = await enrichAttendanceLocationAddresses(
      supabase,
      result.data,
      preferred,
    );
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to load attendance location.",
      code: "error",
    };
  }
}
