import { type ReactNode } from "react";

import { AUDIT_VIEW_PERMISSIONS } from "@/lib/audit/constants";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { requireSuperAdminProfile } from "@/lib/system-admin/guards";

export default async function SuperAdminAuditLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireSuperAdminProfile();
  await requireServerAnyPermission([...AUDIT_VIEW_PERMISSIONS]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-6 pb-8 md:px-6">
        {children}
      </div>
    </div>
  );
}
