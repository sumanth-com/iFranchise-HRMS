import type { ManagerTodayAttendance } from "@/types/manager-self-attendance";

export type SelfAttendancePunchResult =
  | {
      success: true;
      today: ManagerTodayAttendance;
      birthdayCelebration?: {
        employeeId: string;
        firstName: string;
        date: string;
      } | null;
    }
  | { success: false; message: string };
