import type { AttendanceLocationPointKind } from "@/lib/attendance/services/attendance-location";

/**
 * Reverse-geocode via free OpenStreetMap Nominatim (display-only).
 * Never mutates attendance punch/status/hours data.
 */
export async function reverseGeocodeAttendanceAddress(
  latitude: number,
  longitude: number,
): Promise<string | null> {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lon", String(longitude));
  url.searchParams.set("zoom", "18");
  url.searchParams.set("addressdetails", "0");

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "iFranchise-HRMS/1.0 (attendance-location-display)",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) return null;
    const payload = (await response.json()) as { display_name?: string };
    return payload.display_name?.trim() || null;
  } catch {
    return null;
  }
}

export function addressColumnForPoint(
  point: AttendanceLocationPointKind,
): "check_in_address" | "check_out_address" {
  return point === "check_in" ? "check_in_address" : "check_out_address";
}
