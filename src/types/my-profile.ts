import type { EmployeeSelfProfileSettings } from "@/lib/employee/services/employee-self-profile";
import type { EmploymentStatus } from "@/types/auth";
import type { EmployeeAccountStatus } from "@/types/employee";

export type MyProfileAttendanceSummary = {
  presentDays: number;
  totalWorkHours: number;
};

export type MyProfileBundle = {
  employeeId: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  employmentStatus: EmploymentStatus;
  accountStatus: EmployeeAccountStatus;
  departmentName: string | null;
  designationTitle: string | null;
  employmentTypeName: string | null;
  reportingManagerId: string | null;
  reportingManagerName: string | null;
  dateOfJoining: string | null;
  attendanceSummary: MyProfileAttendanceSummary;
  profileImageUrl: string | null;
  profileImagePath: string | null;
  profileSettings: EmployeeSelfProfileSettings;
  selfProfileSubmittedAt: string | null;
  profilePath: string;
};
