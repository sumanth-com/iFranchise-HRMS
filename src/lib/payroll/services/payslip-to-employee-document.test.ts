import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { assertOrganizationStoragePath } from "@/lib/security/storage-path";
import {
  buildPayslipDocumentNotes,
  extractPayslipIdFromDocumentNotes,
  payrollPeriodParts,
} from "@/lib/payroll/services/payslip-employee-document-identity";

describe("payslip → employee_document identity helpers", () => {
  it("derives payroll-month issued_date (not sync date) from payroll month", () => {
    const period = payrollPeriodParts("2026-05-01");
    assert.ok(period);
    assert.equal(period.year, 2026);
    assert.equal(period.month, 5);
    assert.equal(period.periodNotes, "period:2026-05");
    assert.equal(period.issuedDate, "2026-05-01");
  });

  it("accepts YYYY-MM payroll month strings", () => {
    const period = payrollPeriodParts("2026-05");
    assert.ok(period);
    assert.equal(period.issuedDate, "2026-05-01");
  });

  it("encodes and extracts authoritative payslip.id from notes", () => {
    const payslipId = "8afdd3a6-1111-2222-3333-444444444444";
    const notes = buildPayslipDocumentNotes(payslipId, "period:2026-05");
    assert.equal(notes, `payslip_id:${payslipId}|period:2026-05`);
    assert.equal(extractPayslipIdFromDocumentNotes(notes), payslipId.toLowerCase());
    assert.equal(extractPayslipIdFromDocumentNotes("period:2026-05"), null);
  });
});

describe("assertOrganizationStoragePath — payslip Documents bridge", () => {
  const orgId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
  const employeeId = "8afdd3a6-1234-5678-9abc-def012345678";

  it("accepts org-prefixed payslip paths", () => {
    assert.doesNotThrow(() =>
      assertOrganizationStoragePath(
        `${orgId}/payslips/${employeeId}/PS-202605.pdf`,
        orgId,
      ),
    );
  });

  it("accepts legacy payslips/{employeeId}/... only when owned employeeId is provided", () => {
    const legacy = `payslips/${employeeId}/PS-202605-IF2026009.pdf`;
    assert.throws(
      () => assertOrganizationStoragePath(legacy, orgId),
      /outside your organization/i,
    );
    assert.doesNotThrow(() =>
      assertOrganizationStoragePath(legacy, orgId, { employeeId }),
    );
  });

  it("rejects legacy payslip path for a different employee", () => {
    const otherEmployee = "11111111-2222-3333-4444-555555555555";
    assert.throws(
      () =>
        assertOrganizationStoragePath(
          `payslips/${employeeId}/PS-202605.pdf`,
          orgId,
          { employeeId: otherEmployee },
        ),
      /outside your organization/i,
    );
  });

  it("still rejects paths outside org and employee prefixes", () => {
    assert.throws(
      () => assertOrganizationStoragePath("other-org/payslips/x.pdf", orgId),
      /outside your organization/i,
    );
  });
});
