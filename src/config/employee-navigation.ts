import type { NavigationItem } from "@/lib/auth/navigation";
import { buildSelfServiceNavItems } from "@/config/self-service-navigation";
import { EMPLOYEE_ROUTES } from "@/lib/employee/constants";

/**
 * Employee portal sidebar — Self-Service modules only (no Administration block).
 * Employee modules start directly at Dashboard without a section dropdown.
 * Assets and Settings are only available inside the dedicated Super Admin portal.
 */
export const employeeNavItems: NavigationItem[] = buildSelfServiceNavItems({
  home: EMPLOYEE_ROUTES.home,
  profile: EMPLOYEE_ROUTES.profile,
  directory: EMPLOYEE_ROUTES.directory,
  attendance: EMPLOYEE_ROUTES.attendance,
  payroll: EMPLOYEE_ROUTES.payroll,
  reimbursements: EMPLOYEE_ROUTES.reimbursements,
  documents: EMPLOYEE_ROUTES.documents,
  leave: EMPLOYEE_ROUTES.leave,
  goals: EMPLOYEE_ROUTES.goals,
  announcements: EMPLOYEE_ROUTES.announcements,
  notifications: EMPLOYEE_ROUTES.notifications,
}, { includeSection: false });
