import { type ReactNode } from "react";

/**
 * Portal shell wrapper. The HRMS UI is desktop/tablet-first and must remain
 * usable when a desktop browser window is resized narrower — never replace
 * the app with a blocking "Desktop Recommended" screen based on viewport width.
 *
 * Phone UA tablet-access policy is enforced separately (server-side).
 */
export function DesktopOnlyGate({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
