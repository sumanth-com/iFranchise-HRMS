import { LEAVE_POLICY_CONTACT } from "@/lib/leave/leave-policy-data";
import type { AttendancePolicyDocument } from "@/types/attendance-policy";

export const DEFAULT_ATTENDANCE_POLICY_DOCUMENT: AttendancePolicyDocument = {
  intro:
    "This communication covers our official working hours, daily meeting attendance requirements, and important payroll and attendance guidelines. Please review the details carefully.",
  sections: [
    {
      id: "working-hours",
      title: "Official Working Hours & Daily Meeting",
      content: `Our official working hours are 10:00 AM to 7:00 PM. As part of our remote work policy, it is mandatory for every employee to join the daily Main Meeting link at 10:00 AM sharp to mark attendance and begin the workday.

Please note the following:
- Employees are expected to join the Main Meeting link on time every working day.
- Joining the meeting more than 5 minutes after the scheduled time (after 10:05 AM) will be considered a Half-Day Loss of Pay (LOP).
- This Half-Day LOP will not be adjusted against Earned Leave (EL) or any other leave balance.
- In case of an emergency or any unavoidable circumstance, employees must inform the HR team before 10:00 AM. Prior intimation is mandatory, and exceptions will be considered only for genuine emergencies.

We request everyone to maintain punctuality and adhere to the work schedule to ensure smooth collaboration and productivity across the team.`,
    },
    {
      id: "payroll-attendance-update",
      title: "Payroll and Attendance Management Update",
      content: `To ensure clarity, fairness, and consistency in our payroll and attendance management, the HR Department is sharing an important update regarding how weekly offs (Sundays), half-days, and public holidays interact with employee leaves.

Please review the guidelines below, which will come into effect immediately.`,
    },
    {
      id: "weekly-offs",
      title: "Weekly Offs and the Principle of Resuming Duty",
      content: `Our standard workweek runs from Monday to Saturday, with Sunday as our official weekly off. Additionally, the 2nd and 4th Saturdays of every month are half-days (working hours conclude at 2:00 PM).

Sundays and public holidays are paid privileges. To be eligible for a paid Sunday or holiday, an employee must be actively on duty immediately before and after that rest day.`,
    },
    {
      id: "resumption-rule",
      title: "The Resumption of Duty Rule (Handling Loss of Pay)",
      content: `If an employee transitions into Loss of Pay (LOP) or Unpaid Leave status, they remain in an unpaid status until they physically return to the office and resume duty.

The Weekend Loophole: If your planned LOP ends on a Saturday (including 2nd/4th Saturday half-days) and you do not physically report to work for your scheduled shift, you have not broken the continuous chain of absence.

The Result: Because duty was not officially resumed, the succeeding Sunday will automatically be marked as Loss of Pay (LOP). Paid status will only resume on Monday when you physically check back into work.`,
    },
    {
      id: "sandwich-leave",
      title: "The Sandwich Leave Policy",
      content: `To prevent the fragmentation of the workweek, the company follows a strict Sandwich Leave Policy for intervening weekends and holidays.

What is it? If an employee takes leave on the working day(s) immediately before and immediately after a Sunday or public holiday, that Sunday/holiday is considered "sandwiched."

Impact on Paid Leave: If you take approved paid leaves (e.g., CL/EL) on both Saturday and Monday, the intervening Sunday will be deducted from your available leave balance.

Impact on Unpaid Leave (LOP): If the leave on either side of the Sunday is marked as LOP, the sandwiched Sunday will automatically be processed as LOP (Unpaid).`,
    },
    {
      id: "examples",
      title: "Examples for Quick Reference",
      content: `Scenario A (Sandwich Rule): You take LOP on Saturday and LOP on Monday.
Result: Sunday is sandwiched and marked as LOP (Unpaid).

Scenario B (Resuming Duty Rule): You take LOP from Thursday until Saturday. You do not report to work for Saturday's shift. You return to work on Monday.
Result: Since you did not resume duty on Saturday, Sunday is also marked as LOP (Unpaid).`,
    },
    {
      id: "closing",
      title: "Closing Note",
      content: `We kindly request everyone to plan their leaves in advance and manage their leave balances responsibly. If you have any questions or require specific clarifications regarding your leave balance, please feel free to reach out to the HR department.

Thank you for your cooperation.

Best regards,
HR & Operations Team`,
    },
  ],
  contact: { ...LEAVE_POLICY_CONTACT },
  updatedAt: null,
};
