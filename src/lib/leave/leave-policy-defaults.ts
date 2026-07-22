import { LEAVE_POLICY_CONTACT } from "@/lib/leave/leave-policy-data";
import type { LeavePolicyDocument } from "@/types/leave-policy";

export const DEFAULT_LEAVE_POLICY_DOCUMENT: LeavePolicyDocument = {
  intro:
    "This communication outlines the policies and criteria applicable during your probation period, which covers the first three (3) months of employment. Please review the details carefully to ensure full understanding and compliance.",
  sections: [
    {
      id: "probation-entitlement",
      title: "Probation Period Leave Entitlement",
      content: `First Month of Probation: No leave is permitted during the first month of the probation period.

Second and Third Month of Probation: A total of two (2) Casual Leaves (CL) may be availed during the remaining two months of the probation period.

Additional Leave for Female Employees: Female employees are entitled to one (1) additional Period Leave (PL) during the probation period.`,
    },
    {
      id: "communication-guidelines",
      title: "Leave Communication and Approval Guidelines",
      content: `Casual Leave (CL) and Other Leaves
- Leave requests must be formally communicated via email at least 24 hours in advance.
- The email must clearly mention the reason for the leave and the date(s) for which leave is requested.
- All leave requests are subject to approval by the reporting manager and the HR department.

Period Leave (PL)
- Female employees availing Period Leave must inform the HR department via email on the same day, at any time before the end of the working day.
- Prior-day intimation is not mandatory for Period Leave; however, same-day communication is compulsory.

Pre-Planned or Prior Commitments
- Any previously planned or anticipated leave must be communicated to HR and the reporting manager well in advance, preferably at the time of joining or as soon as the information becomes available.

Failure to follow the above communication process may be treated as unauthorized leave.`,
    },
    {
      id: "carry-forward",
      title: "Leave Carry Forward Policy",
      content: `- No leave balance will be carried forward until the successful completion of the probation period.
- Period Leave (PL) is strictly non-carry-forwardable under all circumstances.`,
    },
    {
      id: "post-probation-carry-forward",
      title: "Post-Probation Leave Carry Forward",
      content: `- After confirmation of probation, one (1) Casual Leave (CL) and one (1) Earned Leave (EL) may be carried forward within the current (running) calendar year.
- Earned Leave (EL) balance will be carried forward to the next calendar year as per company policy.
- Employees are entitled to choose two (2) Optional Holidays in a calendar year from the company's approved holiday list.`,
    },
    {
      id: "sales-confirmation",
      title: "Probation Confirmation Criteria – Sales Team",
      content: `- Employees in the Sales team are required to successfully close at least one (1) deal during their probation period to be eligible for probation confirmation.
- If a deal is not closed earlier, the employee must ensure that one deal is closed within the three-month probation period.
- Upon successful closure of one deal at any point during the probation period (including earlier than three months), probation may be confirmed, subject to management approval.
- Failure to meet this criterion may result in probation extension or other action as deemed appropriate by management.

Adherence to both the leave policy and role-specific performance expectations is mandatory during the probation period. Non-compliance may impact probation confirmation.

For any clarification, please feel free to contact the HR department. We appreciate your cooperation and wish you a successful probation period.`,
    },
  ],
  contact: { ...LEAVE_POLICY_CONTACT },
  updatedAt: null,
};
