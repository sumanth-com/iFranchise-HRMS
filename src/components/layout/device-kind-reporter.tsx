"use client";

import { useEffect } from "react";

import {
  detectClientDeviceKind,
  HRMS_CLIENT_DEVICE_COOKIE,
} from "@/lib/device-access/tablet-device";

/** Records a non-HttpOnly device hint so tablet access can be enforced server-side. */
export function DeviceKindReporter() {
  useEffect(() => {
    const kind = detectClientDeviceKind();
    document.cookie = `${HRMS_CLIENT_DEVICE_COOKIE}=${kind}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }, []);

  return null;
}
