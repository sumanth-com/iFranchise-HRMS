import { LEAVE_POLICY_CONTACT } from "@/lib/leave/leave-policy-data";
import type { PayrollPolicyDocument } from "@/types/payroll-policy";

export const DEFAULT_PAYROLL_POLICY_DOCUMENT: PayrollPolicyDocument = {
  intro:
    "At IFRANCHISE SERVICES PRIVATE LIMITED, we believe in creating a transparent, fair, and legally compliant workplace. This policy document is designed to provide you with a comprehensive, clear, and detailed understanding of how your compensation is structured, how your attendance directly influences your monthly pay, and the timelines we follow to process your salary, incentives, tax deductions, and reimbursements. Please read this document carefully. It serves as our official guideline for all payroll-related transactions across all departments.",
  sections: [
    {
      id: "salary-architecture",
      title: "1. Salary Architecture & Component Breakdown",
      content: `Your total compensation is based on a Cost-to-Company (CTC) model. This means that all your allowances, monthly components, and the employer's share of statutory legal contributions (such as Provident Fund and ESI) are packed directly inside your gross package.

Your gross fixed salary is broken down into four distinct blocks to optimize your tax liability under active Indian Income Tax rules:

[TOTAL FIXED GROSS CTC]
Basic Pay (50%) | HRA (25%) | LTA (10%) | Special Allowance (15%)

1.1 Fixed Salary Components

1. Basic Pay (50% of Gross CTC): This is the core, non-variable baseline of your salary. It is fully taxable and serves as the absolute monetary base used to compute your legal social security deductions (like Provident Fund and ESI).

2. House Rent Allowance (HRA - 25% of Gross CTC): This component is structured to help you offset costs if you reside in a rented accommodation. If you choose the Old Tax Regime, you can claim partial or full tax exemptions on this component by submitting valid rent receipts and your landlord's PAN on the HR portal.

3. Leave Travel Allowance (LTA - 10% of Gross CTC): This component is provided to assist you with domestic travel relief. Under the Old Tax Regime, you can claim tax exemptions on this component twice in a block of four calendar years by providing actual travel tickets (air, rail, or public transport).

4. Special Allowance (Remaining 15% of Gross CTC): This is a residual, fully taxable component. It acts as a balancing allowance adjusted flexibly by the payroll engine to line up your individual earnings with your agreed overall fixed CTC tier.

1.2 Intern Stipend Allocation

Paid interns operating at our company do not follow the percentage-based breakdown outlined above. Instead, interns receive a consolidated, flat monthly stipend as explicitly defined in their individual internship agreement. Intern stipends are treated as a flat, single component and are entirely exempt from traditional corporate salary allowances.`,
    },
    {
      id: "incentives-bonuses",
      title: "2. Incentive Systems & Performance Bonuses",
      content: `We reward exceptional work, driving revenue, and building sustainable teams. Our variable pay tracks are separated by department and operational roles:

2.1 Non-Sales Variable Pay Tracks

Full-time employees within non-sales divisions (such as our Tech Team, HR, and Operations) who are allocated a variable pay tier in their contract will become eligible to receive these payouts only upon crossing two specific milestones:

- You must successfully clear your initial 3-month probation period.
- You must complete one full year of continuous tenure as a full-time employee after your probation conversion date.

2.2 Sales Team Incentives & Super Rewards

Transaction Incentives: If you belong to the Sales Team, you earn variable performance-linked incentives tied directly to the deals you close, target metrics achieved, and franchise revenue milestones hit.

Super Rewards: For exceptional work in bringing high-value revenue and closing massive franchise deals, the organization will periodically announce 'Super Rewards.' These represent special cash payouts, luxury items, or experiential bonuses over and above your standard incentive tier.

2.3 HR Sourcing Incentives

Human Resources personnel are eligible to earn a specialized sourcing incentive. This variable pay is triggered when an HR team member sources and brings a high-quality employee onboard, provided that new hire successfully clears their full 3-month probation period and seamlessly converts into full-time status.

2.4 Festival Performance Bonuses

Corporate Vouchers: Around major national and regional festivals, the company may decide to distribute bonus vouchers or digital gift cards to all active team members across all teams.

Non-Sales Additional Bonus: To balance out the continuous incentive opportunities available to sales personnel, our non-sales staff is eligible for additional discretionary cash bonuses.

Discretionary Nature Clause: All festival performance bonuses, vouchers, and additional non-sales cash payouts outlined in this section are entirely at the sole discretion of company management. These bonuses represent optional ex-gratia rewards based on overall corporate profitability and business conditions; they do not constitute a guaranteed salary component, an automatic benefit, or a vested entitlement. The company reserves the absolute right to modify, reduce, withhold, or cancel festival payouts in any given financial year without prior notice or subsequent liability.

2.5 Taxability of Variables, Incentives, and Perks

Mandatory Tax Treatment: In strict accordance with active Income Tax regulations, all additional financial benefits outlined across Section 2—including non-sales variable pay, sales transaction incentives, Super Rewards, HR sourcing incentives, festival vouchers, and seasonal cash bonuses—are considered fully taxable components of your income.

TDS Withholding: The monetary value of these payouts, or the fair market value of non-cash gift vouchers and rewards, will be pooled directly into your gross taxable earnings for the respective month. The payroll system will automatically compute and withhold the required Tax Deducted at Source (TDS) before final credit execution, in alignment with your active tax regime parameters.`,
    },
    {
      id: "payroll-cycle",
      title: "3. The Payroll Cycle & Critical Windows",
      content: `To maintain strict operational rhythm across our departments, our payroll and leave systems operate on the following fixed timeline:

Attendance & Leave Log Window: The tracking period spans strictly from the 1st to the last day (30th/31st) of each calendar month (28th/29th in case of the month of February).

The Monthly System Cut-Off Deadline: You must ensure that all your leave logs, missing check-in/out regularizations, and supervisor attendance exception approvals are successfully submitted and approved in the HRMS portal by the 25th day of the current month.

The Late Entry / Carry-Forward Rule: Any leave or attendance correction submitted after the 25th of the month will be locked out of the current payroll run. The system will automatically push that data to the subsequent month, and it will reflect as a retroactive adjustment in the following month's payslip.

Salary Disbursement Date: Your regular fixed salary or intern stipend will be officially credited to your registered bank account on the 2nd day of the following month.

Variable & Incentive Payout Date: To allow the accounts team to audit revenue data, monthly incentives and quarterly incentives are processed separately and credited to your bank account on the 15th day of the following month (or the 15th day of the month following a quarter-end cycle).

Calendar Overlap Rule: If a designated credit date (the 2nd or the 15th) hits a Sunday, a central bank holiday, or a national public holiday, the payroll division will clear the processing track early to credit your account on the immediate preceding working day.`,
    },
    {
      id: "lop-pro-rata",
      title: "4. Loss of Pay (LOP) & Pro-Rata Math Explanations",
      content: `Your salary is paid strictly for your active, visible output and authorized time off. When you run out of leave balances, or break shift parameters, the system triggers automated deductions.

4.1 The Per-Day LOP Deduction Formula

If you take an unauthorized leave, run out of leave balances, or trigger a weekend sandwich deduction as outlined in our Leave Policy, your gross salary is docked using a standard monthly calendar day calculation:

Per-Day Deduction = Gross Fixed Monthly Salary / Total Number of Calendar Days in that Specific Month

Illustration: If your fixed monthly salary is ₹52,000, and you take 2 unapproved LOP days during August (which has 31 days), the deduction matches: (₹52,000 / 31) × 2 = ₹3,354.84. Your gross pay for that month will adjust to ₹48,645.16.

4.2 The Pro-Rata Hourly Deduction Formula (For Short-Hours and Early Departure)

As per our Attendance Policy, if you check in to work at 10:00 a.m. but exit the premises early without an approved half-day permission or documented medical emergency, your pay is processed on an exact hourly calculation to protect against unlawful wage cuts:

Hourly Deduction Rate = Gross Fixed Monthly Salary / (Total Days in the Month × 8 Shift Hours)

Final Docked Amount = Hourly Deduction Rate × Total Hours Absent

Illustration: You work for 1 hour (10:00 a.m. to 11:00 a.m.) and leave without authorization, missing the remaining 7 hours of your shift. If your monthly gross salary is ₹52,000 in a 31-day month, your hourly rate is ₹52,000 / (31 × 8) = ₹209.67 per hour. The system will dock exactly ₹209.67 × 7 missing hours = ₹1,467.69 from your payslip. You will still be legally paid your ₹209.67 for the 1 single hour you actually worked.`,
    },
    {
      id: "statutory-deductions",
      title: "5. Mandatory Statutory Deductions",
      content: `As we transition into a Private Limited corporate structure (IFRANCHISE SERVICES PRIVATE LIMITED), our payroll module must execute mandatory statutory compliance rules. All calculations are deducted transparently from within your total gross CTC tier.

5.1 Employees' Provident Fund (EPF)

Employer Contribution: 12% of your Basic Pay is contributed by the company directly into your EPFO account. This matches the legal burden inside your total CTC.

Employee Deduction: An identical 12% of your Basic Pay is legally deducted from your gross earnings and deposited into your retirement fund.

5.2 Employees' State Insurance (ESI)

This medical insurance fund applies strictly to employees whose gross monthly salary is ₹21,000 or lower:

Employer Share: 3.25% of your gross monthly wages is calculated inside your CTC tier.

Employee Share: 0.75% of your gross monthly wages is directly deducted from your pay sheet.

5.3 Karnataka Professional Tax (PT)

As a Bangalore-registered corporate entity, we deduct state professional tax using the active slabs set by the Commercial Taxes Department of Karnataka:

- Below ₹25,000 per month (Includes Interns): Base Exempt (₹0 PT Deduction)
- ₹25,000 and above per month: ₹200 per month (*Increased to ₹300 during February to hit the statutory state cap)

Illustration — February Professional Tax (PT) Adjustment: Karnataka law mandates an annual PT cap of ₹2,500. The system splits this automatically to meet the ceiling:

- April to January & March (11 Months): ₹200 / month
- February (Adjustment month): ₹300

Note: Gross salaries of ₹25,000 or above will see a ₹100 increase in deductions during February only.`,
    },
    {
      id: "tds-compliance",
      title: "6. Tax Deducted at Source (TDS), Income Declarations, & Compliance Responsibilities",
      content: `In compliance with centralized Income Tax regulations, the company is legally required to compute and execute Tax Deducted at Source (TDS) on your monthly salary payouts.

6.1 Tax Regime Option Selection

Default Option: The New Tax Regime acts as the automatic default system processing track for all employees. Under this regime, you benefit from lower slab rates and an enhanced Standard Deduction, but you forgo standard chapter exemptions (such as 80C, HRA, and 80D).

Alternative Selection: If you prefer to declare deductions under the Old Tax Regime, you must explicitly log your choice in the HRMS portal during the open window at the start of the financial year (April) or immediately upon your date of joining. Once selected, this track remains fixed for the duration of that specific tax year.

6.2 Submission of Tax Savings Declarations & Proofs

Provisional Declarations: In April/May, you must log your projected annual tax-saving investments in the HRMS portal. Monthly TDS will be averaged and withheld based on this preliminary roadmap.

Actual Proof Submission Verification: A strict system lock opens in December and closes on February 15th. You must upload actual, verified receipts, insurance premium certificates, home loan statements, and clear rent documents into the portal.

Non-Submission Consequences: If you fail to upload verified proofs by the February 15th lock window, the system will discard your provisional declarations. The payroll engine will automatically compute your tax liability using maximum standard rates, resulting in steep retroactive TDS adjustments in your February and March payslips.

6.3 Declarations of Income from Other Sources & Liability Disclaimer

Optional Portal Declaration: For your convenience, the company allows you to voluntarily declare 'Income from Other Sources' under Schedule OS via the HRMS portal. If declared, our payroll team will include these figures in your annual tax path, increasing your monthly salary TDS deduction to prevent a massive pending lump-sum tax bill at the end of the year.

Absolute Company Indemnity & Liability Disclaimer: IFRANCHISE SERVICES PRIVATE LIMITED handles tax computations strictly based on the explicit income you earn internally or formally declare on our portal. The organization carries zero responsibility for monitoring your external personal finances. If an employee fails to declare external income streams, provides fraudulent data, or engages in intentional tax evasion, the employee bears 100% of the legal, civil, and financial liability under the law. The company is entirely indemnified against any inquiry, notice, penalty, or prosecution launched by the Income Tax Department due to an employee's non-disclosure or tax defaults.

6.4 Provision of Form 16

The Certificate: In strict compliance with statutory timelines, the company will issue your itemized Form 16 (Part A and Part B) on or before June 15th immediately following the conclusion of the active financial year.

Filing Baseline: Form 16 serves as your official salary tax report card, verifying the total gross salary earned and the precise TDS amounts successfully remitted to the government. This certificate must be utilized by you to file your individual Income Tax Returns (ITR) smoothly.`,
    },
    {
      id: "payslip-dispute",
      title: "7. Payslip Delivery & The Dispute Window",
      content: `7.1 Payslip Availability

Digital copies of your itemized monthly payslips are auto-generated and released on the 2nd day of the following month, precisely after your salary wire hits your account. You can instantly access, view, and download your statement by logging directly into the centralized HRMS payroll module.

7.2 The 5-Day Payroll Discrepancy Window

We double-check our work, but system glitches or missing log data can happen. It is your responsibility to review your payslip immediately upon delivery.

The Rule: If you believe there is an error in your calculated payable days, an incorrect LOP deduction, a missing incentive tier, or an incorrect tax deduction, you must lodge a formal dispute with the HR/Payroll team within exactly five (5) calendar days from the date your salary was credited (i.e., between the 2nd and the 7th of the month).

How to Raise a Dispute: To log an official review, you must send an email to hr@ifranchise.in with the subject line 'Payroll Discrepancy – [Your Employee ID] – [Current Month/Year]'. You must attach a screenshot or clear text explanation pointing out the exact line item error and provide supporting proof (such as a copy of a manager's prior written email approval or verified HRMS punch exception records).

7.3 What Happens If You Miss the 5-Day Window?

Automatic System Freeze: If you fail to reach out to HR or log an official discrepancy email by the end of the day on the 7th of the month, the payroll database for that cycle is considered verified, locked, and closed.

Operational Consequence: Any genuine adjustment, missing payment, or LOP correction reported after this 5-day window closes cannot be processed manually in that current week. The correction will be held by the finance engine and applied strictly as a retroactive credit entry in the subsequent month's payroll cycle. No out-of-turn or manual check advances will be issued for delayed employee reporting.`,
    },
    {
      id: "reimbursements",
      title: "8. Corporate Business Reimbursements",
      content: `The Invoice Guardrail: To secure a valid corporate reimbursement, you must obtain a formal, clean commercial receipt or tax invoice. The receipt must clearly showcase the vendor's details, date of purchase, exact items/services paid for, and the final monetary value. Hand-written chits or simple credit card slips without a descriptive breakdown are not accepted by our finance auditors.

Submission Timeline: You must upload your expense sheet along with clear digital copies of your receipts into the HRMS reimbursement portal within 7 calendar days of completing the task or incurring the cost. Approved claims are processed by accounting and added directly into your secondary variable pay cycle on the 15th of the month.`,
    },
    {
      id: "fnf-settlement",
      title: "9. Full and Final (FnF) Settlement & Clearance Framework",
      content: `To ensure a structured, transparent, and compliant transition when a team member exits the organization, IFRANCHISE SERVICES PRIVATE LIMITED operates a centralized Full and Final (FnF) settlement track. This policy applies uniformly to all full-time employees, probationers, and interns upon resignation, completion of contract, or formal separation.

9.1 The Settlement Timeline

Standard Processing Window: In compliance with industry standards and corporate guidelines, your FnF settlement statement will be audited, processed, and disbursed within 30 to 45 calendar days from your official Last Working Day (LWD).

Disbursement Track: Final balances will be transferred directly via bank transfer into your registered salary account. A comprehensive, itemized FnF calculation sheet breaking down all earnings, leave encashments, and recoveries will be delivered to your personal email address simultaneously.

9.2 The "No Dues Certificate" (NDC) & Asset Clearance Hold

The release of your final settlement funds is strictly conditional upon the successful completion of an organizational asset and data clearance process.

The Clearance Requirement: Before your last working day, you must return all company property assigned to you, including laptops, chargers, mice, security access badges, identity cards, company SIM cards, keys and company-issued mobile devices (where applicable). Additionally, you must hand over all proprietary source codes, operational files, or client databases to your designated department manager.

The Administrative Hold: The payroll engine will place an automatic administrative freeze on your final payout block. Dues will not be released until the IT, Operations, and Finance divisions formally sign off and issue your unified No Dues Certificate (NDC). Any damage to physical assets or unreturned equipment will be assessed at actual market value and deducted directly from your final balance.

9.3 Final Leave Adjustments & Encashment

Earned Leave (EL) Cash-Out:

- Mid-Employment Encashment: To ensure operational continuity, active full-time employees may apply to encash their accumulated Earned Leave (EL) balance strictly per company cycles, provided their available EL ledger reflects a minimum balance of at least twelve (12) days at the time of the request.
- Encashment Upon Separation: Upon resignation, contract conclusion, or termination, any accrued, unutilized Earned Leave (EL) balance remaining in your account will be paid out in full as part of your Full and Final (FnF) settlement, regardless of the total number of days accumulated. Payouts are calculated based on your basic pay component.

Casual Leave (CL) Forfeiture:

All active Casual Leave (CL) balances carry zero cash-out value. Any remaining CL balance on your last working day expires automatically and cannot be utilized to offset or shorten your notice period requirements.

9.4 Notice Period Recoveries & Adjustments

Unserved Notice Penalties: If you resign from your position but fail to serve the mandatory notice period specified in your individual appointment letter, the company will calculate a pro-rata notice recovery. The exact salary equivalent for the unserved notice days will be calculated using your fixed Gross component and deducted directly from your final settlement.

Shortfall Restrictions: If your total final earnings (earned salary plus eligible leave encashments) are insufficient to cover the notice period recovery or asset damage costs, you must clear the deficit by making a direct financial remittance to the company's corporate bank account before your official relieving letter and service certificates can be generated and released.`,
    },
  ],
  contact: { ...LEAVE_POLICY_CONTACT },
  updatedAt: null,
};
