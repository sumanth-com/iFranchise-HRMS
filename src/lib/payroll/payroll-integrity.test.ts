import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  canRewritePayrollHeader,
  dedupePayrollEmployees,
  evaluatePayrollIntegrity,
  isActiveWorkforcePayrollEmployee,
  isPayrollEligibleEmployee,
  mergePayrollIntegrityNotes,
  payrollRunIncludesOnlyActiveWorkforce,
} from "@/lib/payroll/payroll-integrity";
import { calculateEmployeePayroll } from "@/lib/payroll/services/payroll-calculator";

const visible = {
  id: "e1",
  employee_code: "IF2025002",
  first_name: "Om",
  last_name: "Ramtekkar",
  email: "om@ifranchise.in",
  date_of_joining: "2025-12-01",
  app_hidden_at: null,
  deleted_at: null,
  designationTitle: "Executive",
};

describe("payroll integrity eligibility", () => {
  it("rejects app-hidden and duplicate Gmail profiles", () => {
    assert.equal(
      isPayrollEligibleEmployee({
        ...visible,
        email: "ifranchisehr@gmail.com",
        app_hidden_at: "2026-08-31T00:00:00Z",
      }),
      false,
    );
  });

  it("excludes the IT system account from payroll eligibility", () => {
    assert.equal(
      isPayrollEligibleEmployee({
        ...visible,
        employee_code: "IF2026000",
        first_name: "IT",
        last_name: "Team",
        email: "it@ifranchise.in",
      }),
      false,
    );
  });

  it("rejects other directory-excluded employees", () => {
    assert.equal(
      isPayrollEligibleEmployee({
        ...visible,
        employee_code: "IF-MGR-001",
        first_name: "Marketing",
        last_name: "Manager",
      }),
      false,
    );
  });

  it("rejects employees who join after the payroll month", () => {
    assert.equal(
      isPayrollEligibleEmployee(
        { ...visible, date_of_joining: "2026-08-16" },
        "2026-04-30",
      ),
      false,
    );
    assert.equal(isPayrollEligibleEmployee(visible, "2026-09-30"), true);
  });

  it("uses active workforce status for current payroll runs", () => {
    const today = new Date("2026-10-02T12:00:00+05:30");
    for (const employment_status of ["active", "probation", "on_leave"] as const) {
      assert.equal(
        isActiveWorkforcePayrollEmployee({ ...visible, employment_status }, "2026-10-31"),
        true,
      );
    }
    for (const employment_status of ["resigned", "terminated"] as const) {
      assert.equal(
        isActiveWorkforcePayrollEmployee({ ...visible, employment_status }, "2026-10-31"),
        false,
      );
    }

    assert.equal(
      payrollRunIncludesOnlyActiveWorkforce({
        payrollStatus: "draft",
        isLocked: false,
        payrollMonth: "2026-10-01",
        today,
      }),
      true,
    );
    assert.equal(
      payrollRunIncludesOnlyActiveWorkforce({
        payrollStatus: "draft",
        isLocked: false,
        payrollMonth: "2026-11-01",
        today,
      }),
      true,
    );
    assert.equal(
      payrollRunIncludesOnlyActiveWorkforce({
        payrollStatus: "processed",
        isLocked: false,
        payrollMonth: "2026-09-01",
        today,
      }),
      false,
    );
    assert.equal(
      payrollRunIncludesOnlyActiveWorkforce({
        payrollStatus: "approved",
        isLocked: false,
        payrollMonth: "2026-10-01",
        today,
      }),
      false,
    );
    assert.equal(
      payrollRunIncludesOnlyActiveWorkforce({
        payrollStatus: "paid",
        isLocked: true,
        payrollMonth: "2026-08-01",
        today,
      }),
      false,
    );
  });

  it("drops former employees from current-run totals and keeps them on historical runs", () => {
    const former = {
      ...visible,
      id: "former",
      employee_code: "IF-FORMER-01",
      email: "former.employee@ifranchise.in",
      employment_status: "resigned",
    };
    const active = { ...visible, employment_status: "active" };
    const items = [
      {
        employeeId: "e1",
        grossSalary: 25000,
        totalDeductions: 200,
        netSalary: 24800,
        employee: active,
      },
      {
        employeeId: "former",
        grossSalary: 50000,
        totalDeductions: 200,
        netSalary: 49800,
        employee: former,
      },
    ];

    const current = evaluatePayrollIntegrity({
      periodEnd: "2026-10-31",
      headerGross: 25000,
      headerDeductions: 200,
      headerNet: 24800,
      requireActiveEmployment: true,
      items,
    });
    assert.equal(current.eligibleItems.length, 1);
    assert.equal(current.eligibleItems[0]?.employeeId, "e1");
    assert.equal(current.totals.totalGross, 25000);
    assert.equal(current.totals.totalNet, 24800);

    const historical = evaluatePayrollIntegrity({
      periodEnd: "2026-09-30",
      headerGross: 75000,
      headerDeductions: 400,
      headerNet: 74600,
      items,
    });
    assert.equal(historical.eligibleItems.length, 2);
    assert.equal(historical.ok, true);
  });

  it("dedupes the same email so a person is counted once", () => {
    const unique = dedupePayrollEmployees([
      visible,
      { ...visible, id: "e2", employee_code: "IF-DUP" },
    ]);
    assert.equal(unique.length, 1);
    assert.equal(unique[0]?.id, "e1");
  });
});

describe("payroll integrity totals and finalization checks", () => {
  it("sums header totals from eligible items only", () => {
    const report = evaluatePayrollIntegrity({
      periodEnd: "2026-09-30",
      headerGross: 418166.67,
      headerDeductions: 0,
      headerNet: 418166.67,
      items: [
        {
          employeeId: "e1",
          grossSalary: 25000,
          totalDeductions: 0,
          netSalary: 25000,
          employee: visible,
        },
        {
          employeeId: "hidden",
          grossSalary: 93715.98,
          totalDeductions: 2277,
          netSalary: 91438.98,
          employee: {
            ...visible,
            id: "hidden",
            employee_code: "IF-MGR-001",
            first_name: "Marketing",
            last_name: "Manager",
            email: "hidden.manager@ifranchise.in",
            designationTitle: "Marketing Manager",
          },
        },
      ],
    });
    assert.equal(report.totals.totalGross, 25000);
    assert.equal(report.totals.totalNet, 25000);
    assert.equal(report.ok, false);
    assert.ok(report.issues.some((issue) => issue.code === "hidden_or_excluded"));
    assert.ok(report.issues.some((issue) => issue.code === "header_mismatch"));
  });

  it("flags duplicate employee ids", () => {
    const report = evaluatePayrollIntegrity({
      periodEnd: "2026-09-30",
      headerGross: 50000,
      headerDeductions: 0,
      headerNet: 50000,
      items: [
        {
          employeeId: "e1",
          grossSalary: 25000,
          totalDeductions: 0,
          netSalary: 25000,
          employee: visible,
        },
        {
          employeeId: "e1",
          grossSalary: 25000,
          totalDeductions: 0,
          netSalary: 25000,
          employee: visible,
        },
      ],
    });
    assert.ok(report.issues.some((issue) => issue.code === "duplicate_employee"));
  });

  it("does not rewrite historical paid or processed headers", () => {
    assert.equal(
      canRewritePayrollHeader({
        payrollStatus: "paid",
        isLocked: false,
        payrollMonth: "2026-05-01",
        today: new Date(2026, 8, 3),
      }),
      false,
    );
    assert.equal(
      canRewritePayrollHeader({
        payrollStatus: "processed",
        isLocked: false,
        payrollMonth: "2026-08-01",
        today: new Date(2026, 8, 3),
      }),
      false,
    );
    assert.equal(
      canRewritePayrollHeader({
        payrollStatus: "processed",
        isLocked: false,
        payrollMonth: "2026-09-01",
        today: new Date(2026, 8, 3),
      }),
      true,
    );
    assert.equal(
      canRewritePayrollHeader({
        payrollStatus: "approved",
        isLocked: true,
        payrollMonth: "2026-09-01",
        today: new Date(2026, 8, 3),
      }),
      false,
    );
  });

  it("keeps integrity notes for HR review without dropping other notes", () => {
    const merged = mergePayrollIntegrityNotes("Keep this.", [
      { code: "header_mismatch", message: "Totals differ." },
    ]);
    assert.match(merged ?? "", /Keep this/);
    assert.match(merged ?? "", /PAYROLL_INTEGRITY/);
    assert.match(merged ?? "", /not auto-corrected/);
  });
});

describe("statutory deductions from salary structure", () => {
  const structure = {
    id: "s1",
    employee_id: "e1",
    basic_salary: 20000,
    hra_amount: 5000,
    transport_allowance: 0,
    other_allowances: 0,
    tax_deduction: 0,
    other_deductions: 0,
    gross_salary: 25000,
    net_salary: 24700,
    components: {
      pf: 0,
      esi: 0,
      professionalTax: 200,
      incomeTax: 100,
    },
  };
  const attendance = {
    presentDays: 26,
    absentDays: 0,
    halfDays: 0,
    onLeaveDays: 0,
    weekOffDays: 4,
    holidayDays: 4,
    overtimeHours: 0,
    lateDays: 0,
  };

  it("applies PF/ESI/PT/TDS from the structure when those components are enabled", () => {
    const result = calculateEmployeePayroll({
      month: 9,
      year: 2026,
      asOfDate: new Date("2026-10-15"),
      salaryStructure: structure,
      attendance,
      bonuses: [],
      reimbursements: [],
      settings: {
        salaryComponents: {
          pf: true,
          esi: true,
          professionalTax: true,
          incomeTax: true,
        },
      },
    });
    assert.equal(result.breakdown.attendance.paidDays, 30);
    assert.equal(result.breakdown.deductions.find((line) => line.code === "pt")?.amount, 200);
    assert.equal(
      result.breakdown.deductions.find((line) => line.code === "income_tax")?.amount,
      100,
    );
    assert.equal(result.netSalary, 24_700);
  });

  it("does not invent statutory amounts when the structure has zeros", () => {
    const result = calculateEmployeePayroll({
      month: 9,
      year: 2026,
      asOfDate: new Date("2026-10-15"),
      salaryStructure: { ...structure, components: { pf: 0, esi: 0, professionalTax: 0, incomeTax: 0 }, net_salary: 25000 },
      attendance,
      bonuses: [],
      reimbursements: [],
    });
    assert.equal(result.breakdown.deductions.find((line) => line.code === "pf"), undefined);
    // PT is derived from monthly salary (≥25k → 200), not structure zeros
    assert.equal(result.breakdown.deductions.find((line) => line.code === "pt")?.amount, 200);
    assert.equal(result.netSalary, 24_800);
  });
});
