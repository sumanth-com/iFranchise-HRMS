import { LEAVE_POLICY_CONTACT } from "@/lib/leave/leave-policy-data";
import type { AttendancePolicyDocument } from "@/types/attendance-policy";
import type { LeavePolicyDocument, LeavePolicySection } from "@/types/leave-policy";

export type PolicyEmployeeCategory = "full_time" | "intern_probation";

const SHARED_ATTENDANCE_SECTIONS: LeavePolicySection[] = [
  {
    id: "work-hours",
    title: "Attendance Policy — Working days and hours",
    content: `Your normal work schedule is Monday to Saturday, 10:00 a.m. to 7:00 p.m. On full working days, lunch is from 2:00 p.m. to 3:00 p.m. The second and fourth Saturday of each month are half-days and end at 2:00 p.m. Sundays are weekly offs.

Please use HRMS to check in and check out every day. You are expected to check in at 10:00 a.m. and check out at 7:00 p.m. There is a five-minute grace period for check-in.`,
  },
  {
    id: "late-entry",
    title: "Attendance Policy — Late attendance",
    content: `If you check in after 10:05 a.m. without approval, it is a Late Entry.

Three Late Entries in the HR-defined tracking period result in half-day LOP. This is an attendance penalty. It cannot be changed into paid leave.

If you know you will be late, get written approval first from your Reporting Manager and tell HR.

Illustration: If you have permission to start at 11:00 a.m., you must work until 8:00 p.m. to complete the day. If you leave at 7:00 p.m., the day can be marked as LOP.`,
  },
  {
    id: "missing-punch",
    title: "Attendance Policy — Missing check-in or check-out",
    content: `If HRMS does not show either your check-in or your check-out, the day may be marked LOP. Tell HR quickly if this happened because of a genuine system problem. HR should check the facts before payroll is finalised.`,
  },
  {
    id: "half-day",
    title: "Attendance Policy — Half-day leave and second-half absence",
    content: `iFranchise permits the utilization of approved leave in half-day increments, subject to strict operational and scheduling guidelines.

Second-Half Utilization Only: A half-day leave is permissible only for the second half of the working day (3:00 p.m. to 7:00 p.m.). To avail of a half-day leave, the employee must report to work on time, complete their scheduled duties during the first half of the day, and formally request a second-half departure via the HRMS portal with prior managerial approval.

No First-Half Leaves: iFranchise does not permit or approve half-day leaves for the first half of the day (10:00 a.m. to 2:00 p.m.). If an employee is unable to report to work at the start of their scheduled shift and wishes to take the morning off, they must apply for a full-day leave. If no leave balance is available, the entire day will be processed as a full-day Loss of Pay (LOP).

Unplanned Early Departure Safeguard: If an employee completes the first half of their shift but must leave early due to an unforeseen personal emergency, a half-day will be deducted from their leave balance (or marked as half-day LOP if no balance remains). This ensures employees are accurately compensated for the hours they actually worked, protecting both the employee and the company from non-compliant full-day wage deductions.

Illustration: You report to work at 10:00 a.m. but need to leave at 2:30 p.m. for an urgent personal reason. Because you completed the first half of your shift, this will be recorded as a half-day leave deduction. However, if you need to take the morning off for a doctor's appointment and plan to come in at 3:00 p.m., you cannot file a half-day; you must apply for a full day of leave.`,
  },
  {
    id: "abuse-short-hours",
    title: "Absence Policy — Abuse of policy and extreme short-hours",
    content: `Policy Forfeiture: If you report to work but leave the premises before completing the mandatory first-half shift (10:00 a.m. to 2:00 p.m.) without a documented medical emergency or pre-approved short-leave, you forfeit the right to apply for a half-day leave.

Payroll Execution: In such cases, the system will apply the legal principle of Proportional Deduction (No Work, No Pay). You will be compensated strictly for the exact hours recorded on the biometric or HRMS punch data, and the remaining missing shift hours will be deducted directly from your payroll.

Disciplinary Tracking: Leaving the office after negligible morning attendance (e.g., working for less than 2 hours) without immediate managerial sign-off will be flagged as an Unauthorised Absence and treated as a breach of workplace discipline, independent of the payroll hour calculation.`,
  },
  {
    id: "no-ot-comp-off",
    title: "Special Rules — No overtime or compensatory off",
    content: `To maintain absolute operational consistency and predictable scheduling parameters, iFranchise operates strictly under a fixed-hours model. Employees must familiarize themselves with the explicit exclusions below:

No Overtime (OT) Allocation or Compensation: iFranchise does not recognize, permit, or compensate for "Overtime" hours. The standard shift timings outlined in Section 3 (10:00 a.m. to 7:00 p.m. Monday to Saturday, and half-days on designated Saturdays) represent the absolute maximum operational boundary required for your position.

Prioritization of Standard Shifts: Staying back past 7:00 p.m. on regular working days, or past 2:00 p.m. on half-day Saturdays, is strictly a matter of individual time management or voluntary workload self-pacing. It does not create any right to additional monetary pay, bonuses, or payroll adjustments.

No Compensatory Off (Comp-Off) Provision: This organization does not offer a Comp-Off framework under any circumstances. Working past standard hours to finish a task, meeting an urgent project delivery timeline, or logging in outside standard shifts will not result in the accrual of alternative rest days or "substituted" leaves.

Unauthorized Holiday Work Forbidden: Employees are strictly prohibited from reporting to the office premises or accessing company networks on standard weekly offs (Sundays) or officially declared National and Festival Holidays without explicit, written, and pre-approved instructions from Executive Management. If an unauthorized log-in occurs, it will be treated as a voluntary action and will not generate a Comp-Off credit or salary adjustment.`,
  },
];

const HOW_TO_APPLY_LEAVE: LeavePolicySection = {
  id: "how-to-apply",
  title: "Leave Policy — How to apply for leave",
  content: `For planned leave, complete all three steps before your leave begins. A leave request is not approved just because it is entered into the HRMS portal.

Email Notification: Send a formal email request to your Reporting Manager and HR. Clearly mention the requested date(s), reason for absence, intended return date, and emergency handover/contact details.

Management Approval: Secure explicit written or system approval from your Reporting Manager, HR, or another designated authority.

HRMS Submission: Log the identical request within the HRMS portal and ensure it moves to an "Approved" status.

Good practice: Retain a copy of your email or HRMS approval confirmation. While your manager determines operational and team coverage, HR and payroll confirm final leave balance tracking and any LOP calculations.

Planned leave: when to apply

You must adhere to the minimum planning timelines below when requesting planned time off:

- 1–2 days: At least 24–48 hours earlier
- 3–5 days: At least 2–3 weeks earlier
- More than 5 days / long vacation: Normally 1–3 months earlier; major travel may need 4–6 months

These parameters serve as a minimum planning framework and do not guarantee automatic approval. Do not lock in non-refundable travel or personal plans until your leave status is formally confirmed in HRMS.

Emergency leave

Emergency leave is reserved strictly for unexpected, urgent situations that prevent you from reporting to work. Examples include personal accidents, sudden illness, sudden hospitalisation of yourself or an immediate family member, a death in the family, or a major natural disaster making transit impossible.

Immediate Notice: Notify your Reporting Manager and HR via phone or email as soon as you realize you cannot attend your shift, ideally within 30 to 60 minutes of your scheduled start time.

Delayed Contact: If an emergency prevents you from making contact before your shift begins, alert management as soon as reasonably practicable. If you are entirely incapacitated, a family member or authorized representative may notify the company on your behalf.

System Log: Submit the formal request in the HRMS portal immediately upon your return to duty.

Documentation: HR reserves the right to request reasonable, official supporting documentation (such as a medical certificate or discharge summary) to validate the emergency track. All medical and personal information will be handled with strict confidentiality.

Important: Failure to provide a valid reason or the requested supporting documentation for an unplanned absence may result in the period being flagged as an unauthorized absence, triggering an internal review.`,
};

const SANDWICH_FULL_TIME: LeavePolicySection = {
  id: "sandwich-rule",
  title: "Absence Policy — Sandwich rule",
  content: `A "sandwich" happens when your leave or absence sits next to a Sunday, company holiday, festival holiday, closure day, or (where it applies to you) an Optional Holiday. HRMS may count the whole uninterrupted calendar period as leave or LOP, subject to statutory exemptions for declared holidays.

Plain-English rule: If you are away from work on both sides of a non-working day, that non-working day can be counted too. Available paid leave is used first. Any days that are not covered by paid leave become LOP.

Exception: Officially declared National and Festival Holidays are legally protected and will never be subject to sandwich deductions or LOP, regardless of surrounding absences.

HR first finds the beginning and end of one continuous absence. It then includes the non-working days in the middle. A second/fourth Saturday is still a scheduled workday, even though it is shorter.

Common illustrations:

- Holiday – leave – Sunday: Dasara is a declared company festival holiday on the 14th. You take leave on the 15th. The 16th is Sunday. The 14th is a paid statutory holiday and remains untouched. The absence span strictly begins on the 15th. If you return on the 17th, the leave span is 15th to 16th (two days).
- Leave on both sides of a holiday: You take leave on the 24th and 27th, with Diwali on the 25th (declared holiday) and a scheduled workday on the 26th. The statutory holiday on the 25th cannot be sandwiched. The sandwich rule is broken. Only the 24th and 27th are deducted as individual leave days.
- Leave starts after a holiday block: Sunday is the 24th and Diwali is the 25th. You take leave on the 26th without resuming work. The leave span starts strictly on the 26th. An employee cannot be retroactively penalized or charged leaves for standard calendar non-working days or statutory holidays that occurred prior to the start of their leave period.
- Mixed holiday block: You are absent on the 9th, Sunday is the 10th, you are absent on the 11th, and Ramadan is a declared holiday on the 12th. The sandwich rule applies strictly to the weekly off (Sunday 10th). The continuous absence span counts as 3 days (9th, 10th, and 11th). The statutory holiday on the 12th is excluded from the block and paid out normally.
- Saturday and Monday: You are absent on a Saturday and do not report on Monday. Sunday is between them. All three days can be counted. This is contractually permissible because it involves regular weekly non-working days, not statutory public or festival holidays.
- Actual resumption matters: You are away Thursday and Friday, do not attend the scheduled Saturday, and return Monday. Monday does not prove that you resumed duty on Saturday. Saturday is part of the absence; Sunday may also be included under the standard weekend sandwich rule.

For a full-time employee, an Optional Holiday is part of the non-working block only if that employee actually selected and received approval for that OH. If they did not select it, it is a normal workday.`,
};

const SANDWICH_INTERN_PROBATION: LeavePolicySection = {
  id: "sandwich-rule",
  title: "Absence Policy — Sandwich rule",
  content: `A "sandwich" happens when your leave or absence sits next to a Sunday, regular weekly off, or a standard non-working day. The HRMS portal may calculate the entire continuous calendar block of absence as a single leave period or LOP block, subject to explicit statutory protections for declared public holidays.

Plain-English rule: If you are away from work on both sides of a non-working day, that non-working day can be counted too. Available paid leave is used first. Any days that are not covered by paid leave become LOP.

Exception: Officially declared National and Festival Holidays are legally protected and will never be subject to sandwich deductions or LOP, regardless of surrounding absences.

HR first finds the beginning and end of one continuous absence. It then includes the non-working days in the middle. A second/fourth Saturday is still a scheduled workday, even though it is shorter.

Common illustrations:

- Holiday – leave – Sunday: Dasara is a declared company festival holiday on the 14th. You take leave on the 15th. The 16th is Sunday. The 14th is a paid statutory holiday and remains untouched. The absence span strictly begins on the 15th. If you return on the 17th, the leave span is 15th to 16th (two days).
- Leave on both sides of a holiday: You take leave on the 24th and 27th, with Diwali on the 25th (declared holiday) and a scheduled workday on the 26th. The statutory holiday on the 25th cannot be sandwiched. The sandwich rule is broken. Only the 24th and 27th are deducted as individual leave days.
- Leave starts after a holiday block: Sunday is the 24th and Diwali is the 25th. You take leave on the 26th without resuming work. The leave span starts strictly on the 26th. An employee cannot be retroactively penalized or charged leaves for standard calendar non-working days or statutory holidays that occurred prior to the start of their leave period.
- Mixed holiday block: You are absent on the 9th, Sunday is the 10th, you are absent on the 11th, and Ramadan is a declared holiday on the 12th. The sandwich rule applies strictly to the weekly off (Sunday 10th). The continuous absence span counts as 3 days (9th, 10th, and 11th). The statutory holiday on the 12th is excluded from the block and paid out normally.
- Saturday and Monday: You are absent on a Saturday and do not report on Monday. Sunday is between them. All three days can be counted. This is contractually permissible because it involves regular weekly non-working days, not statutory public or festival holidays.
- Actual resumption matters: You are away Thursday and Friday, do not attend the scheduled Saturday, and return Monday. Monday does not prove that you resumed duty on Saturday. Saturday is part of the absence; Sunday may also be included under the standard weekend sandwich rule.`,
};

const RETURN_AND_EXTEND: LeavePolicySection = {
  id: "return-and-extend",
  title: "Absence Policy — Returning to work and extending leave",
  content: `You must actually resume duty

Your leave or LOP status ends only when you actually report for and complete your next scheduled working day. A Sunday, public holiday or company closure does not count as coming back to work.

Illustration: If your leave/LOP ends on Friday but you do not attend the scheduled Saturday, coming back on Monday does not count as resuming work on Saturday. Saturday stays part of the absence, and Sunday may be counted under the sandwich rule.

If you need more leave

Ask for an extension by email and HRMS before your approved leave ends, wherever reasonably possible. Explain why you need more time and give the new return date. An extension is approved only when you receive approval. Staying away without approval can be recorded as LOP and may be treated as unauthorised absence.`,
};

const UNAUTHORISED_ABSENCE: LeavePolicySection = {
  id: "unauthorised-absence",
  title: "Absence Policy — Unauthorised absence",
  content: `An absence may be treated as unauthorised when you do not follow the leave process, do not return on the agreed date, or do not give a reasonable explanation when asked. It is normally recorded as LOP unless a statutory or protected leave applies.

If unauthorised absence is more than two days, iFranchise may send a show-cause notice. You will normally get at least 48 hours to give a written explanation. HR will look at your explanation, messages, medical/emergency facts, work record and the law before deciding what to do.

Possible outcomes range from counselling or a warning to disciplinary action, including termination where lawful and proportionate. HRMS cannot automatically end employment; required notice, enquiry and fair-process rules still apply.`,
};

const MATERNITY: LeavePolicySection = {
  id: "maternity-statutory",
  title: "Leave Policy — Maternity and related statutory leave",
  content: `This policy ensures that iFranchise operates in strict accordance with the Maternity Benefit Act, 1961 (and its amendments) and The Employees' State Insurance (ESI) Act, 1948. Statutory maternity benefits apply absolutely to all eligible female employees, overriding any internal rules regarding paid leave balances.

1. Statutory Eligibility Criteria

To be eligible for fully paid maternity leave benefits under this policy, a female employee must have been employed at iFranchise for a minimum of 80 days within the 12 months immediately preceding her expected date of delivery. This baseline includes all days worked, scheduled weekly holidays, and approved paid leaves.

2. Core Leave Entitlements

- Standard Benefit: A woman employee with fewer than two surviving children is entitled to a maximum of 26 weeks of fully paid maternity leave, of which up to 8 weeks can precede the expected date of delivery.
- Two or More Children: A woman employee with two or more surviving children is entitled to 12 weeks of fully paid maternity leave, of which up to 6 weeks can precede the expected date of delivery.
- Adoption and Commissioning Mothers: A female employee who legally adopts a child under three months of age, or a commissioning mother in a surrogacy arrangement, is entitled to 12 weeks of paid leave starting from the date the child is handed over.

3. Related Statutory Protections

- Miscarriage / Medical Termination of Pregnancy (MTP): In the event of a miscarriage or medical termination of pregnancy, the employee is entitled to 6 weeks of fully paid leave immediately following the day of the incident, subject to producing prescribed medical proof. No 80-day previous work minimum is required to claim this specific benefit.
- Tubectomy Operation: An employee undergoing a tubectomy operation is entitled to 2 weeks of paid leave immediately following the day of her operation.
- Illness Arising out of Pregnancy: An additional leave period of up to 1 month with full wages is permissible for illness arising out of pregnancy, delivery, premature birth, or miscarriage.
- Nursing Breaks: Upon returning to duty, mothers are legally entitled to two designated nursing breaks during their daily shift to nurse the child until the child reaches the age of 15 months, in addition to standard rest intervals.
- Crèche Facilities: In compliance with statutory thresholds, any iFranchise office employing 50 or more employees will provide access to a crèche facility within a prescribed distance. Eligible employees are allowed four visits daily to the crèche, inclusive of standard rest intervals.
- Work From Home: If the nature of the work assigned to an employee is such that she may perform it from home, iFranchise may allow her to do so after the expiry of her statutory maternity leave period, under mutually agreed terms.

What you should do

- Prior Intimation: Notify HR privately and in writing as early as practicable. Per the law, you must be informed of your available maternity entitlements both in writing and electronically upon your date of appointment.
- Medical Certification: Submit a formal medical certificate/notice specifying the expected delivery date if requested by HR.
- HRMS Workflow: Log the statutory request via HRMS. HR will verify the dates, eligibility thresholds (completion of at least 80 days of work with iFranchise in the 12 months preceding delivery), and route the payment track.
- ESI Integration: Employees whose monthly wages fall within the statutory threshold for the ESI scheme will receive their financial cash benefits directly through the Employees' State Insurance Corporation (ESIC) framework rather than corporate payroll.
- Updates: Notify HR immediately if medical guidance shifts your intended return or extension timeline.`,
};

const RECORDS_FAIRNESS: LeavePolicySection = {
  id: "records-fairness",
  title: "Special Rules — Records, questions and fairness",
  content: `HR keeps attendance, approvals and leave records for payroll and compliance. Medical and family information is kept with restricted access.

If you think your attendance, leave balance or LOP is wrong, contact HR promptly, preferably before payroll cut-off. HR will review the records and correct verified errors.

HR may approve exceptions in writing where appropriate. Decisions must be fair, consistent, non-discriminatory and must not punish anyone for asking for a statutory benefit.

This policy does not change your appointment letter or guarantee continued employment unless it expressly says so.

Remember: When in doubt, inform your manager and HR early, ask for written approval, enter the request in HRMS, and return on your agreed workday.`,
};

const FULL_TIME_LEAVE_SECTIONS: LeavePolicySection[] = [
  {
    id: "who-for",
    title: "Leave Policy — Who this policy applies to",
    content: `This policy is for regular full-time employees. Your full-time leave service normally starts from the date you are converted to full-time, not from the day you joined on probation. If your appointment letter gives you a better benefit, that benefit applies.`,
  },
  {
    id: "leave-balance",
    title: "Leave Policy — Leave eligibility and entitlement",
    content: `Casual Leave (CL)

- You receive one CL each month. That is 12 CL in a full calendar year.
- CL can be carried forward only within the same calendar year.
- Any CL left on 31 December expires. It is not encashed.
- A fresh monthly CL credit starts again from January.
- Half-Day Utilization: CL can be split into half-day blocks, subject to the second-half operational guidelines detailed in Section 3 of this policy.

Earned Leave (EL)

- You receive one EL each month. That is 12 EL in a full calendar year.
- EL carries forward while you remain employed, subject to any better or mandatory legal rule.
- You may encash EL during employment only in January, if you have at least 12 EL, using the process set by HR/payroll.
- When you leave iFranchise, eligible EL may be encashed in your full-and-final settlement if you have at least 12 EL, subject to law, tax and payroll rules.

Illustration: If you have 14 EL in January, you meet the 12-EL minimum for an encashment request. HR/payroll will tell you the process and rate.

When you do not have enough leave

HRMS normally uses the leave type you requested and approved. If a day cannot be covered by approved CL or EL, it becomes LOP. LOP normally cannot be replaced by leave credited later, except when HR corrects an error or a statutory benefit applies.`,
  },
  {
    id: "holidays",
    title: "Holidays — Official and optional holidays",
    content: `You receive the company's paid holidays: Sundays and the other holidays in the annual company holiday calendar (Refer to Annexure).

Optional Holidays (OH)

- You may take up to two paid Optional Holidays in each calendar year. You may choose only from the company's published OH list (Refer to Annexure).
- An OH is a normal working day unless you choose it and it is approved.
- Apply for OH in advance by email and HRMS. It is subject to staffing needs.
- Unused OH expires on 31 December. It does not carry forward or get encashed.
- If you do not choose an OH, you work as usual that day.

Illustration: You choose and receive approval for Christmas as your first OH. It is a paid day off. If you do not choose Holi, Holi is a normal workday for you.`,
  },
  HOW_TO_APPLY_LEAVE,
  SANDWICH_FULL_TIME,
  RETURN_AND_EXTEND,
  UNAUTHORISED_ABSENCE,
  MATERNITY,
  RECORDS_FAIRNESS,
  {
    id: "quick-checklist",
    title: "Special Rules — Quick checklist before taking leave",
    content: `- Check Balances: Verify in HRMS that you have sufficient Casual Leave (CL) or Earned Leave (EL) balances before booking a day off.
- Verify Half-Day Timing: Remember that half-day leave can only be applied to the second half of the day (3:00 p.m. onwards). If you need the morning off, you must book a full-day leave.
- Follow the Plan Steps: For scheduled leaves, send an email to HR and your manager early, secure written approval, and then file the matching request in HRMS.
- Report Emergency Absences: For unforeseen absences, alert your manager and HR within 30–60 minutes of your shift starting, then complete your HRMS entry as soon as you return.
- Check the Weekend Sandwich: If your leave touches a Sunday or a scheduled non-working weekend, check the sandwich rule parameters to see if the intervening rest day will count toward your leave balance or LOP.
- Understand Festival Protections: Note that officially declared statutory National and Festival holidays are entirely exempt from the sandwich rule and will never be deducted from your leave balance or payroll.
- Request Extensions Early: If you need to stay away longer, apply for an extension in writing and via HRMS before your current leave period expires.
- Return on Schedule: Always resume actual duty on your next designated working day. Simply hitting a calendar Sunday or public holiday does not count as breaking your leave or resuming work.`,
  },
];

const INTERN_PROBATION_LEAVE_SECTIONS: LeavePolicySection[] = [
  {
    id: "who-for",
    title: "Leave Policy — Who this policy applies to",
    content: `This policy is for paid interns and employees in their probation period. If you complete internship or probation successfully and are offered full-time employment with iFranchise, the separate Full-Time Employees policy applies from your conversion date, unless your contract gives you a better benefit.`,
  },
  {
    id: "leave-balance",
    title: "Leave Policy — Leave eligibility and entitlement",
    content: `Your first month

- You do not receive Casual Leave (CL) credit during your first month of employment. This initial period is dedicated to core training, onboarding, and learning your operational role.
- Absences or leave requests during the first month are permitted only for verified, serious emergencies or exceptional circumstances, subject to prior written approval from your Reporting Manager and HR.
- Unless a statutory paid leave applies, any approved absence during your first month will be processed as Loss of Pay (LOP).

Illustration: You join iFranchise on 1 June and require one emergency day off on 15 June. If management approves the request, the absence is processed as LOP because no CL balance has been credited to your account yet, unless a statutory leave applies.

From your second month

- Monthly Credit: You receive a credit of one (1) day of Casual Leave (CL) for each completed month of service, starting from your second month until your internship or probation period concludes.
- Balance Enforcement: You may only utilize the exact CL balance that is displayed as available and approved within the HRMS portal.
- Monthly Expiration: Unused CL balances expire automatically at the end of each calendar month. Leave balances do not carry forward or accumulate into the following month.
- Loss of Pay (LOP): If you are absent for more days than your available monthly CL balance, the extra days are automatically processed as LOP. LOP days will not create a negative leave balance in the system and cannot be retroactively replaced or cleared by CL credits received in future months.
- Half-Day Utilization: CL can be split into half-day blocks, subject strictly to the second-half operational guidelines detailed in Section 3 of this policy.

Illustration: In July, you have a credit of one approved CL day. If you face an emergency and are away for two days, one day will consume your available CL. The second day will be processed as an unpaid LOP day.

When you do not have enough leave

The HRMS portal processes absences based on the specific leave type you requested and secured approval for. If an absent day cannot be covered by an approved CL balance, it is automatically recorded as LOP. LOP entries cannot be replaced by leaves credited at a later date, except in cases where HR explicitly corrects a system error or an applicable statutory benefit takes precedence.`,
  },
  {
    id: "holidays",
    title: "Holidays — Official holidays",
    content: `You receive the company's paid holidays: Sundays and the other holidays in the annual company holiday calendar (Refer to Annexure).`,
  },
  HOW_TO_APPLY_LEAVE,
  SANDWICH_INTERN_PROBATION,
  RETURN_AND_EXTEND,
  UNAUTHORISED_ABSENCE,
  MATERNITY,
  RECORDS_FAIRNESS,
  {
    id: "quick-checklist",
    title: "Special Rules — Quick checklist before taking leave",
    content: `- Check Balances: Verify in HRMS that you have sufficient Casual Leave (CL) balance before booking a day off.
- Verify Half-Day Timing: Remember that half-day leave can only be applied to the second half of the day (3:00 p.m. onwards). If you need the morning off, you must book a full-day leave.
- Follow the Plan Steps: For scheduled leaves, send an email to HR and your manager early, secure written approval, and then file the matching request in HRMS.
- Report Emergency Absences: For unforeseen absences, alert your manager and HR within 30–60 minutes of your shift starting, then complete your HRMS entry as soon as you return.
- Check the Weekend Sandwich: If your leave touches a Sunday or a scheduled non-working weekend, check the sandwich rule parameters to see if the intervening rest day will count toward your leave balance or LOP.
- Understand Festival Protections: Note that officially declared statutory National and Festival holidays are entirely exempt from the sandwich rule and will never be deducted from your leave balance or payroll.
- Request Extensions Early: If you need to stay away longer, apply for an extension in writing and via HRMS before your current leave period expires.
- Return on Schedule: Always resume actual duty on your next designated working day. Simply hitting a calendar Sunday or public holiday does not count as breaking your leave or resuming work.`,
  },
];

function attendanceWhoSection(category: PolicyEmployeeCategory): LeavePolicySection {
  if (category === "full_time") {
    return {
      id: "who-for",
      title: "Attendance Policy — Who this policy applies to",
      content: `This attendance policy is for regular full-time employees. If your appointment letter gives you a better benefit, that benefit applies.`,
    };
  }
  return {
    id: "who-for",
    title: "Attendance Policy — Who this policy applies to",
    content: `This attendance policy is for paid interns and employees in their probation period. If you are converted to full-time employment, the Full-Time Employees policy applies from your conversion date.`,
  };
}

export function buildLeavePolicyDocument(category: PolicyEmployeeCategory): LeavePolicyDocument {
  const isFullTime = category === "full_time";
  return {
    intro: "Please read this guide before applying for leave. It explains what you need to do in simple words.",
    sections: isFullTime ? FULL_TIME_LEAVE_SECTIONS : INTERN_PROBATION_LEAVE_SECTIONS,
    contact: { ...LEAVE_POLICY_CONTACT },
    updatedAt: null,
  };
}

export function buildAttendancePolicyDocument(
  category: PolicyEmployeeCategory,
): AttendancePolicyDocument {
  const isFullTime = category === "full_time";
  return {
    intro: isFullTime
      ? "This guide covers working hours, check-in/check-out expectations, late attendance, half-day rules, and related attendance guidelines for full-time employees."
      : "This guide covers working hours, check-in/check-out expectations, late attendance, half-day rules, and related attendance guidelines for interns and employees on probation.",
    sections: [attendanceWhoSection(category), ...SHARED_ATTENDANCE_SECTIONS],
    contact: { ...LEAVE_POLICY_CONTACT },
    updatedAt: null,
  };
}

export const DEFAULT_FULL_TIME_LEAVE_POLICY = buildLeavePolicyDocument("full_time");
export const DEFAULT_INTERN_PROBATION_LEAVE_POLICY = buildLeavePolicyDocument("intern_probation");
export const DEFAULT_FULL_TIME_ATTENDANCE_POLICY = buildAttendancePolicyDocument("full_time");
export const DEFAULT_INTERN_PROBATION_ATTENDANCE_POLICY =
  buildAttendancePolicyDocument("intern_probation");

export function policyDocumentForCategory(
  category: PolicyEmployeeCategory,
  kind: "leave" | "attendance",
): LeavePolicyDocument {
  if (kind === "leave") {
    return buildLeavePolicyDocument(category);
  }
  return buildAttendancePolicyDocument(category);
}

export function showsOptionalHolidayTable(category: PolicyEmployeeCategory): boolean {
  return category === "full_time";
}
