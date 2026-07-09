export type ApplicationAuditInput = {
  organizationId: string | null;
  module: string;
  action: string;
  description: string;
  recordId?: string;
  eventStatus?: "success" | "failed";
  priority?: "low" | "medium" | "high" | "critical";
  ipAddress?: string;
  userAgent?: string;
  deviceType?: string;
  browser?: string;
  operatingSystem?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
};

export function parseClientAuditContext(userAgent: string | null | undefined) {
  const ua = userAgent ?? "";
  const lower = ua.toLowerCase();

  let deviceType = "Desktop";
  if (/mobile|android|iphone|ipod/i.test(ua)) deviceType = "Mobile";
  else if (/ipad|tablet/i.test(ua)) deviceType = "Tablet";

  let browser = "Unknown";
  if (lower.includes("edg/")) browser = "Edge";
  else if (lower.includes("chrome/")) browser = "Chrome";
  else if (lower.includes("firefox/")) browser = "Firefox";
  else if (lower.includes("safari/") && !lower.includes("chrome/")) browser = "Safari";

  let operatingSystem = "Unknown";
  if (lower.includes("windows")) operatingSystem = "Windows";
  else if (lower.includes("mac os")) operatingSystem = "macOS";
  else if (lower.includes("android")) operatingSystem = "Android";
  else if (lower.includes("iphone") || lower.includes("ipad")) operatingSystem = "iOS";
  else if (lower.includes("linux")) operatingSystem = "Linux";

  return { deviceType, browser, operatingSystem };
}

export async function getRequestAuditContext() {
  const { headers } = await import("next/headers");
  const headerStore = await headers();
  const userAgent = headerStore.get("user-agent");
  const forwarded = headerStore.get("x-forwarded-for");
  const ipAddress = forwarded?.split(",")[0]?.trim() ?? headerStore.get("x-real-ip") ?? undefined;
  const parsed = parseClientAuditContext(userAgent);

  return {
    ipAddress,
    userAgent: userAgent ?? undefined,
    ...parsed,
  };
}
