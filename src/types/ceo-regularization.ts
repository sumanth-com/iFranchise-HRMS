import type { ExecutiveRequestCategory } from "@/lib/approvals/executive-request-routing";

export type CeoRegularizationQueueItem = {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  departmentName: string | null;
  requestCategory: ExecutiveRequestCategory;
  requestCategoryLabel: string;
  attendanceDate: string;
  requestedCheckInAt: string | null;
  requestedCheckOutAt: string | null;
  reason: string;
  submittedAt: string;
  correctionStatus: "pending";
};

export type CeoRegularizationActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; message: string };
