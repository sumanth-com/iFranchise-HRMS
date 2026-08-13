import { type ReactNode } from "react";

import { SuperAdminNotificationsSubNav } from "@/components/system-admin/super-admin-notifications-sub-nav";

export default function SuperAdminNotificationsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4 md:p-5">
      <SuperAdminNotificationsSubNav />
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
