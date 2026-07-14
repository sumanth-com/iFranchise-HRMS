import { type ReactNode } from "react";

import { ManagerNotificationsSubNav } from "@/components/manager/manager-notifications-sub-nav";

export default function ManagerNotificationsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4 md:p-5">
      <ManagerNotificationsSubNav />
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
