import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AuditDetailView } from "@/components/audit/audit-detail-view";
import { buttonVariants } from "@/components/common/button";
import { logAuditViewAction } from "@/lib/audit/actions";
import {
  AUDIT_VIEW_PERMISSIONS,
  resolveAuditRoutes,
} from "@/lib/audit/constants";
import { buildAuditLogRef, isAuditUuid } from "@/lib/audit/display";
import { getAuditLogDetail } from "@/lib/audit/services/audit-queries";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { requireSuperAdminProfile } from "@/lib/system-admin/guards";
import { SYSTEM_ADMIN_ROUTES } from "@/lib/system-admin/constants";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type Props = {
  params: Promise<{ ref: string }>;
};

export default async function SuperAdminAuditDetailPage({ params }: Props) {
  await requireSuperAdminProfile();
  const profile = await requireServerAnyPermission([...AUDIT_VIEW_PERMISSIONS]);
  const supabase = await createClient();
  const { ref } = await params;
  const detail = await getAuditLogDetail(supabase, profile, ref);

  if (!detail) notFound();

  const routes = resolveAuditRoutes(SYSTEM_ADMIN_ROUTES.audit);
  const shortRef = buildAuditLogRef(detail.id);
  if (isAuditUuid(ref) && ref !== shortRef) {
    redirect(routes.detail(detail.id));
  }

  await logAuditViewAction(detail.id);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <header className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Audit Detail</h1>
          <p className="text-sm text-muted-foreground">
            Actor, record changes, status, and device context for this event.
          </p>
        </header>
        <Link
          href={routes.logs}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Back to logs
        </Link>
      </div>
      <AuditDetailView detail={detail} />
    </div>
  );
}
