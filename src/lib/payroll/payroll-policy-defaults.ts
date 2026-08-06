import { LEAVE_POLICY_CONTACT } from "@/lib/leave/leave-policy-data";
import type { PayrollPolicyDocument } from "@/types/payroll-policy";

export const DEFAULT_PAYROLL_POLICY_DOCUMENT: PayrollPolicyDocument = {
  intro:
    "This document explains how salary is processed, how income tax is deducted, and how you can access payslips and annual tax documentation. Please review the details carefully.",
  sections: [
    {
      id: "salary-cycle",
      title: "Salary Cycle & Payment",
      content: `Salaries are processed monthly for the prior calendar month. Payment is typically credited to your registered bank account by the last working day of the month, subject to payroll approval and bank processing timelines.

Ensure your bank account details in HR records are accurate. Any change in bank account must be updated through HR before the payroll cut-off date for that month.`,
    },
    {
      id: "payslips",
      title: "Payslips",
      content: `Monthly payslips are published in the HR portal after payroll is approved. Each payslip shows earnings, deductions, and net pay for the month.

You can download your latest payslip from the Payroll page. Payslip PDFs are password-protected using your employee ID for security.`,
    },
    {
      id: "tds",
      title: "Income Tax (TDS)",
      content: `Tax Deducted at Source (TDS) is calculated based on your annual income projection, applicable tax slabs, and any tax-saving declarations submitted to HR.

If you have not submitted investment or exemption proofs, tax may be deducted at a higher rate. Submit declarations and proofs before the company deadline each financial year.`,
    },
    {
      id: "tax-documents",
      title: "Form 16 & Tax Documents",
      content: `Form 16 and other annual tax documents are issued after the financial year ends and tax reconciliation is complete. These documents summarize salary paid and tax deducted for the year.

Tax documents are shared through the HR portal or directly by the HR/Finance team. Contact HR if you need a duplicate or corrected tax certificate.`,
    },
    {
      id: "pf",
      title: "Provident Fund (PF)",
      content: `If applicable, employee and employer PF contributions are deducted as per statutory rules and reflected in your payslip. UAN and PF account details should be maintained with HR.

For PF balance or passbook queries, contact HR with your UAN number.`,
    },
    {
      id: "queries",
      title: "Payroll Queries",
      content: `For salary discrepancies, missing payslips, tax deduction questions, or reimbursement and bonus queries, reach out to the HR department using the contact details below.

Please include your employee ID, month in question, and a brief description of the issue so we can resolve it quickly.`,
    },
  ],
  contact: { ...LEAVE_POLICY_CONTACT },
  updatedAt: null,
};
