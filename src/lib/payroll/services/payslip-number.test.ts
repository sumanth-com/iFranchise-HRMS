import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  generatePayslipNumber,
  officialPayslipNumber,
  resolveDisplayedPayslipNumber,
} from "@/lib/payroll/services/payroll-utils";

describe("official payslip numbers", () => {
  it("uses payroll month and employee code for previous, current, and future months", () => {
    assert.equal(officialPayslipNumber("IF2026009", "2026-07-01"), "PS-202607-IF2026009");
    assert.equal(officialPayslipNumber("IF2026009", "2026-08-01"), "PS-202608-IF2026009");
    assert.equal(officialPayslipNumber("IF2026009", "2026-09-01"), "PS-202609-IF2026009");
    assert.equal(generatePayslipNumber("IF2026009", "2026-10-01"), "PS-202610-IF2026009");
    assert.equal(officialPayslipNumber("IF2026009", "2026-11-01"), "PS-202611-IF2026009");
  });

  it("keeps the same number when the stored value has a random suffix", () => {
    assert.equal(
      resolveDisplayedPayslipNumber({
        storedNumber: "PS-202609-IF2026009-A1B2C3D4",
        employeeCode: "IF2026009",
        payrollMonth: "2026-09-01",
      }),
      "PS-202609-IF2026009",
    );
  });

  it("does not invent a number without an employee code", () => {
    assert.equal(officialPayslipNumber("", "2026-09-01"), null);
    assert.equal(officialPayslipNumber("IF2026009", ""), null);
  });
});
