import Link from "next/link";
import { notFound } from "next/navigation";

import { AuditDetailView } from "@/components/audit/audit-detail-view";
import { logAuditViewAction } from "@/lib/audit/actions";
import { AUDIT_ROUTES, AUDIT_VIEW_PERMISSIONS } from "@/lib/audit/constants";
import { getAuditLogDetail } from "@/lib/audit/services/audit-queries";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AuditDetailPage({ params }: Props) {
  const profile = await requireServerAnyPermission([...AUDIT_VIEW_PERMISSIONS]);
  const supabase = await createClient();
  const { id } = await params;
  const detail = await getAuditLogDetail(supabase, profile, id);

  if (!detail) notFound();

  await logAuditViewAction(id);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Audit Detail</h1>
          <p className="mt-1 text-sm text-muted-foreground">Full context for this audit event.</p>
        </div>
        <Link
          href={AUDIT_ROUTES.logs}
          className="inline-flex h-9 items-center justify-center rounded-md border px-4 text-sm font-medium hover:bg-muted"
        >
          Back to logs
        </Link>
      </div>
      <AuditDetailView detail={detail} />
    </div>
  );
}
