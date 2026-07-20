import { notFound } from "next/navigation";

import { LeaveDetailView } from "@/components/leave/leave-detail-view";
import { createClient } from "@/lib/supabase/server";
import { getLeaveRequestById } from "@/lib/leave/services/leave-detail";
import { requireServerPermission } from "@/lib/permissions/server";

type LeaveDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function LeaveDetailPage({ params }: LeaveDetailPageProps) {
  const profile = await requireServerPermission("leave.view");
  const supabase = await createClient();
  const { id } = await params;
  const leave = await getLeaveRequestById(supabase, profile, id);

  if (!leave) notFound();

  return <LeaveDetailView leave={leave} />;
}
