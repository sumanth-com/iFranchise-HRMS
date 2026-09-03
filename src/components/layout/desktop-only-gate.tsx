import { type ReactNode } from "react";

import { DesktopOnlyNotice } from "@/components/layout/desktop-only-notice";

/**
 * Shows {@link DesktopOnlyNotice} instead of `children` on phones.
 * Tablets and desktop render `children`. Desktop (≥1024px) is `display: contents`
 * so the approved desktop layout is unchanged.
 */
export function DesktopOnlyGate({ children }: { children: ReactNode }) {
  return (
    <>
      <DesktopOnlyNotice />
      <div className="portal-desktop-only">{children}</div>
    </>
  );
}
