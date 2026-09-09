import type { AttendanceDisplayStatus } from "@/types/attendance";

export type AttendanceLocationPointKind = "check_in" | "check_out";

export type AttendanceGpsPoint = {
  kind: AttendanceLocationPointKind;
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  address: string | null;
  recordedAt: string | null;
};

export type AttendanceLocationDetails = {
  attendanceId: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  attendanceDate: string;
  attendanceStatus: AttendanceDisplayStatus;
  checkInAt: string | null;
  checkOutAt: string | null;
  checkIn: AttendanceGpsPoint | null;
  checkOut: AttendanceGpsPoint | null;
};

export type AttendanceLocationFlags = {
  hasCheckInLocation: boolean;
  hasCheckOutLocation: boolean;
};

/** Format stored GPS for display without truncating meaningful digits. */
export { formatGpsCoordinate } from "@/lib/attendance/gps-format";

/** Valid WGS84 coordinates suitable for map display. */
export function isValidLatLng(latitude: unknown, longitude: unknown): boolean {
  const lat = toFiniteNumber(latitude);
  const lng = toFiniteNumber(longitude);
  if (lat == null || lng == null) return false;
  if (lat < -90 || lat > 90) return false;
  if (lng < -180 || lng > 180) return false;
  // Reject null-island / zero placeholders that are almost never real office GPS.
  if (lat === 0 && lng === 0) return false;
  return true;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/** Legacy punch path stored optional coords as `geo:lat,lng` in notes. */
export function parseGeoNoteCoordinates(
  notes?: string | null,
): { latitude: number; longitude: number } | null {
  if (!notes?.trim()) return null;

  for (const part of notes.split("|").map((segment) => segment.trim())) {
    const match = /^geo:(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/i.exec(part);
    if (!match) continue;
    const latitude = Number(match[1]);
    const longitude = Number(match[2]);
    if (isValidLatLng(latitude, longitude)) {
      return { latitude, longitude };
    }
  }

  return null;
}

export function resolveAttendanceLocationFlags(input: {
  checkInLatitude?: unknown;
  checkInLongitude?: unknown;
  checkOutLatitude?: unknown;
  checkOutLongitude?: unknown;
  notes?: string | null;
}): AttendanceLocationFlags {
  const fromColumnsIn = isValidLatLng(
    input.checkInLatitude,
    input.checkInLongitude,
  );
  const fromColumnsOut = isValidLatLng(
    input.checkOutLatitude,
    input.checkOutLongitude,
  );
  const fromNotes = parseGeoNoteCoordinates(input.notes);

  return {
    hasCheckInLocation: fromColumnsIn || Boolean(fromNotes),
    // Legacy notes only capture a single punch point; treat as check-in.
    hasCheckOutLocation: fromColumnsOut,
  };
}

export function buildGpsPoint(input: {
  kind: AttendanceLocationPointKind;
  latitude: unknown;
  longitude: unknown;
  accuracyMeters?: unknown;
  address?: string | null;
  recordedAt?: string | null;
  notes?: string | null;
  fallbackRecordedAt?: string | null;
}): AttendanceGpsPoint | null {
  let latitude = toFiniteNumber(input.latitude);
  let longitude = toFiniteNumber(input.longitude);

  if (!isValidLatLng(latitude, longitude) && input.kind === "check_in") {
    const fromNotes = parseGeoNoteCoordinates(input.notes);
    if (fromNotes) {
      latitude = fromNotes.latitude;
      longitude = fromNotes.longitude;
    }
  }

  if (!isValidLatLng(latitude, longitude)) {
    return null;
  }

  const accuracy = toFiniteNumber(input.accuracyMeters);

  return {
    kind: input.kind,
    latitude: latitude as number,
    longitude: longitude as number,
    accuracyMeters:
      accuracy != null && accuracy >= 0 ? Math.round(accuracy * 10) / 10 : null,
    address: input.address?.trim() || null,
    recordedAt: input.recordedAt ?? input.fallbackRecordedAt ?? null,
  };
}

export function attendanceLocationHref(
  attendanceBasePath: string,
  attendanceId: string,
  point?: AttendanceLocationPointKind,
) {
  const base = `${attendanceBasePath.replace(/\/$/, "")}/location/${attendanceId}`;
  if (!point) return base;
  // Short, stable query: ?point=in | ?point=out
  const short = point === "check_in" ? "in" : "out";
  return `${base}?point=${short}`;
}
