import { CEO_PORTAL_MANUAL } from "@/lib/ceo/ceo-portal-manual";
import { HR_PORTAL_MANUAL } from "@/lib/dashboard/hr-portal-manual";
import { EMPLOYEE_PORTAL_MANUAL } from "@/lib/employee/employee-portal-manual";
import type { PortalManual } from "@/lib/help/portal-manual";
import { MANAGER_PORTAL_MANUAL } from "@/lib/manager/manager-portal-manual";
import type { PortalVariant } from "@/providers/auth-provider";

const MANUAL_DESCRIPTION =
  "Select a module on the left. The right side explains what it is, why it helps, how to use it, and every feature inside — with no redirect links.";

export const PORTAL_MANUALS: Record<PortalVariant, PortalManual> = {
  employee: {
    title: "Employee Portal manual",
    description: MANUAL_DESCRIPTION,
    sections: EMPLOYEE_PORTAL_MANUAL,
  },
  hr: {
    title: "HR Portal manual",
    description: MANUAL_DESCRIPTION,
    sections: HR_PORTAL_MANUAL,
  },
  manager: {
    title: "Manager Portal manual",
    description: MANUAL_DESCRIPTION,
    sections: MANAGER_PORTAL_MANUAL,
  },
  ceo: {
    title: "Executive Portal manual",
    description: MANUAL_DESCRIPTION,
    sections: CEO_PORTAL_MANUAL,
  },
};
