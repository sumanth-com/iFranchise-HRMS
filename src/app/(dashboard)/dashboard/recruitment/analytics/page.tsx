import { HiringAnalyticsPanels } from "@/components/recruitment/hiring-analytics-panels";
import { createClient } from "@/lib/supabase/server";
import { getHiringAnalytics } from "@/lib/recruitment/services/recruitment-queries";
import { requireServerPermission } from "@/lib/permissions/server";

export default async function AnalyticsPage() {
  const profile = await requireServerPermission("recruitment.view");
  const supabase = await createClient();
  const analytics = await getHiringAnalytics(supabase, profile);

  return <HiringAnalyticsPanels analytics={analytics} />;
}
