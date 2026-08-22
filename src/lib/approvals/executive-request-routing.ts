import { isHrLeaveApplicant } from "@/lib/leave/services/leave-queries";

export const MANAGER_LEAVE_APPLICANT_ROLE_CODES = ["manager"] as const;

export function isManagerLeaveApplicant(roleCodes: string[]): boolean {
  if (isHrLeaveApplicant(roleCodes)) return false;
  return roleCodes.some((code) =>
    (MANAGER_LEAVE_APPLICANT_ROLE_CODES as readonly string[]).includes(code),
  );
}

export function requiresCeoLeaveApproval(roleCodes: string[]): boolean {
  return isHrLeaveApplicant(roleCodes) || isManagerLeaveApplicant(roleCodes);
}

export function requiresCeoRegularizationApproval(roleCodes: string[]): boolean {
  return requiresCeoLeaveApproval(roleCodes);
}

export type ExecutiveRequestCategory = "hr" | "manager";

export function getExecutiveRequestCategory(
  roleCodes: string[],
): ExecutiveRequestCategory | null {
  if (isHrLeaveApplicant(roleCodes)) return "hr";
  if (isManagerLeaveApplicant(roleCodes)) return "manager";
  return null;
}

export function executiveRequestCategoryLabel(
  category: ExecutiveRequestCategory,
): string {
  return category === "hr" ? "HR Request" : "Manager Request";
}
