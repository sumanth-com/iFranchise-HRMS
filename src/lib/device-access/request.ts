import { cookies, headers } from "next/headers";

import {
  HRMS_CLIENT_DEVICE_COOKIE,
  isTabletAccessClient,
} from "@/lib/device-access/tablet-device";

export async function isTabletClientRequest(formDevice?: string | null): Promise<boolean> {
  const headerStore = await headers();
  const cookieStore = await cookies();
  return isTabletAccessClient({
    userAgent: headerStore.get("user-agent"),
    deviceCookie: cookieStore.get(HRMS_CLIENT_DEVICE_COOKIE)?.value ?? null,
    formDevice: formDevice ?? null,
  });
}
