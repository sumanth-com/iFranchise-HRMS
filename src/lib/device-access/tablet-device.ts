export const HRMS_CLIENT_DEVICE_COOKIE = "hrms_client_device";

export type ClientDeviceKind = "desktop" | "tablet" | "phone";

const PHONE_UA =
  /iphone|ipod|windows phone|blackberry|bb10|opera mini|mobile safari|android.+mobile|android.+; wv/i;

export function isPhoneUserAgent(userAgent: string | null | undefined): boolean {
  const ua = userAgent ?? "";
  if (!ua) return false;
  if (/ipad/i.test(ua)) return false;
  if (/android/i.test(ua) && !/mobile/i.test(ua)) return false;
  return PHONE_UA.test(ua);
}

export function isTabletUserAgent(userAgent: string | null | undefined): boolean {
  const ua = userAgent ?? "";
  if (!ua || isPhoneUserAgent(ua)) return false;
  if (/ipad/i.test(ua)) return true;
  if (/tablet/i.test(ua)) return true;
  if (/android/i.test(ua) && !/mobile/i.test(ua)) return true;
  if (/macintosh/i.test(ua) && /mobile/i.test(ua)) return true;
  return false;
}

export function parseClientDeviceKind(
  value: string | null | undefined,
): ClientDeviceKind | null {
  if (value === "desktop" || value === "tablet" || value === "phone") {
    return value;
  }
  return null;
}

/**
 * Tablet HRMS access is decided from UA plus an optional client hint.
 * A desktop hint never overrides a tablet UA (iPad “Request Desktop Website”).
 */
export function isTabletAccessClient(input: {
  userAgent?: string | null;
  deviceCookie?: string | null;
  formDevice?: string | null;
}): boolean {
  if (isPhoneUserAgent(input.userAgent)) return false;
  if (isTabletUserAgent(input.userAgent)) return true;

  const hinted =
    parseClientDeviceKind(input.formDevice) ??
    parseClientDeviceKind(input.deviceCookie);
  return hinted === "tablet";
}

export function detectClientDeviceKind(): ClientDeviceKind {
  if (typeof navigator === "undefined") return "desktop";

  const ua = navigator.userAgent;
  const touchPoints = navigator.maxTouchPoints ?? 0;

  if (isPhoneUserAgent(ua)) return "phone";
  if (isTabletUserAgent(ua)) return "tablet";
  if (/macintosh/i.test(ua) && touchPoints > 1) return "tablet";
  return "desktop";
}
