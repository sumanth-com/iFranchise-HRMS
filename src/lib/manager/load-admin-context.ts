import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import {
  resolveManagerDepartmentIds,
  resolveTeamEmployeeIds,
} from "@/lib/manager/portal-scope";
import { getPerformanceLookups } from "@/lib/performance/services/performance-queries";
import { requireServerPermission } from "@/lib/permissions/server";
import { getRecruitmentLookups } from "@/lib/recruitment/services/recruitment-queries";
import { createClient } from "@/lib/supabase/server";

export async function requireManagerPortal() {
  return requireServerPermission(PORTAL_PERMISSIONS.manager);
}

export async function loadManagerPerformancePage() {
  const profile = await requireManagerPortal();
  const supabase = await createClient();
  const teamIds = await resolveTeamEmployeeIds(supabase, profile);
  const lookups = await getPerformanceLookups(
    supabase,
    profile.employee.organizationId,
    teamIds,
  );
  return { profile, supabase, teamIds, lookups };
}

export async function loadManagerRecruitmentPage() {
  const profile = await requireManagerPortal();
  const supabase = await createClient();
  const departmentIds = await resolveManagerDepartmentIds(supabase, profile);
  const lookups = await getRecruitmentLookups(
    supabase,
    profile.employee.organizationId,
    departmentIds,
  );
  return { profile, supabase, departmentIds, lookups };
}
