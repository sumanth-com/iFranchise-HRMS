import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isSystemProvidedPayrollTaxCode,
  SYSTEM_PROVIDED_PAYROLL_TAX_CODES,
} from "@/lib/employee/documents/categories";

describe("system-provided Payroll & Tax document codes", () => {
  it("includes Payslip, Form 16, and Tax Document only", () => {
    assert.deepEqual(
      [...SYSTEM_PROVIDED_PAYROLL_TAX_CODES].sort(),
      ["FORM_16", "PAYSLIP", "TAX_DOCUMENT"],
    );
  });

  it("matches codes case-insensitively", () => {
    assert.equal(isSystemProvidedPayrollTaxCode("payslip"), true);
    assert.equal(isSystemProvidedPayrollTaxCode("FORM_16"), true);
    assert.equal(isSystemProvidedPayrollTaxCode("TAX_DOCUMENT"), true);
    assert.equal(isSystemProvidedPayrollTaxCode("RESUME"), false);
    assert.equal(isSystemProvidedPayrollTaxCode("PREVIOUS_PAYSLIPS"), false);
  });
});
