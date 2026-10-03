import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { listEmployeeAnnouncements } from "@/lib/organization/services/company-announcement-queries";

/** One announcement read per request, shared by the employee layout and dashboard. */
export const loadEmployeeAnnouncementsForRequest = cache(
  async function loadEmployeeAnnouncementsForRequest(
    organizationId: string,
    employeeId: string,
  ) {
    const supabase = await createClient();
    return listEmployeeAnnouncements(supabase, organizationId, employeeId);
  },
);
