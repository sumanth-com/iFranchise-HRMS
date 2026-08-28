import { type ReactNode } from "react";

import { DesktopOnlyNotice } from "@/components/layout/desktop-only-notice";

/**
 * Shows {@link DesktopOnlyNotice} instead of `children` on phones and tablets.
 *
 * The swap is pure CSS: above the breakpoint the wrapper is `display: contents`,
 * so it generates no box and the desktop layout is completely unaffected.
 */
export function DesktopOnlyGate({ children }: { children: ReactNode }) {
  return (
    <>
      <DesktopOnlyNotice />
      <div className="portal-desktop-only">{children}</div>
    </>
  );
}
