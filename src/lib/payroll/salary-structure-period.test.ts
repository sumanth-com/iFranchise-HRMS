import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  employeeJoinedBy,
  filterSalaryStructuresForPeriod,
  monthlyGrossPerDay,
  salaryStructureCoversPeriod,
} from "@/lib/payroll/salary-structure-period";
import type { SalaryStructureItem } from "@/types/payroll";

function row(
  partial: Partial<SalaryStructureItem> & Pick<
    SalaryStructureItem,
    "id" | "employeeId" | "employeeName" | "effectiveFrom"
  >,
): SalaryStructureItem {
  return {
    employeeCode: "X",
    departmentName: null,
    designationTitle: null,
    employmentTypeName: null,
    employmentTypeId: null,
    effectiveTo: null,
    currencyCode: "INR",
    basicSalary: 0,
    hraAmount: 0,
    transportAllowance: 0,
    otherAllowances: 0,
    grossSalary: 10_000,
    netSalary: 10_000,
    taxDeduction: 0,
    otherDeductions: 0,
    components: {},
    isCurrent: false,
    joiningDate: "2026-05-04",
    ...partial,
  };
}

describe("salary structure period", () => {
  it("treats an open May structure as in force in September", () => {
    assert.equal(
      salaryStructureCoversPeriod("2026-05-04", null, "2026-09-01", "2026-09-30"),
      true,
    );
  });

  it("stops using a structure after its effective_to", () => {
    assert.equal(
      salaryStructureCoversPeriod("2026-05-04", "2026-08-31", "2026-09-01", "2026-09-30"),
      false,
    );
  });

  it("hides employees who join after the selected month", () => {
    assert.equal(employeeJoinedBy("2026-05-04", "2026-04-30"), false);
    assert.equal(employeeJoinedBy("2026-05-04", "2026-05-31"), true);
  });

  it("divides monthly gross by calendar days", () => {
    assert.equal(monthlyGrossPerDay(13_500, 30), 450);
  });

  it("carries the latest covering structure into a later month filter", () => {
    const records = [
      row({
        id: "s1",
        employeeId: "e1",
        employeeName: "Anmol",
        effectiveFrom: "2026-05-04",
        isCurrent: true,
        grossSalary: 13_500,
      }),
      row({
        id: "not_set_e2",
        employeeId: "e2",
        employeeName: "New Hire",
        effectiveFrom: "2026-09-01",
        joiningDate: "2026-09-15",
      }),
    ];

    const september = filterSalaryStructuresForPeriod(records, {
      month: 9,
      year: 2026,
      employeeId: "all",
      status: "all",
    });

    assert.equal(september.length, 2);
    assert.equal(september[0]?.id, "s1");
    assert.equal(september[0]?.isCurrent, true);

    const april = filterSalaryStructuresForPeriod(records, {
      month: 4,
      year: 2026,
      employeeId: "all",
      status: "all",
    });
    assert.equal(april.length, 0);
  });
});
