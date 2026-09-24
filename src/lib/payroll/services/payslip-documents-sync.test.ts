import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isPayslipOfficiallyReleasedToEmployee,
  resolveEmployeePayslipReleaseAt,
} from "@/lib/payroll/services/payslip-publication";

describe("payslip Documents mirror release gate", () => {
  it("treats email_sent_at as official release (visible in Documents sync)", () => {
    assert.equal(
      isPayslipOfficiallyReleasedToEmployee({
        publishedAt: "2026-08-01T00:00:00Z",
        emailSentAt: "2026-08-05T10:00:00Z",
      }),
      true,
    );
  });

  it("treats lifecycle sentAt as release when email bookkeeping is missing", () => {
    assert.equal(
      resolveEmployeePayslipReleaseAt({
        publishedAt: "2026-07-01T00:00:00Z",
        emailSentAt: null,
        payrollLifecycle: { itemStatus: "sent", sentAt: "2026-07-02T12:00:00Z" },
      }),
      "2026-07-02T12:00:00Z",
    );
  });

  it("keeps draft/unpublished payslips out of Documents sync", () => {
    assert.equal(
      isPayslipOfficiallyReleasedToEmployee({
        publishedAt: null,
        emailSentAt: null,
        payrollLifecycle: { itemStatus: "draft", sentAt: null },
      }),
      false,
    );
    assert.equal(
      isPayslipOfficiallyReleasedToEmployee({
        publishedAt: "2026-09-01T00:00:00Z",
        emailSentAt: null,
        payrollLifecycle: { itemStatus: "reviewed", sentAt: null },
      }),
      false,
    );
  });
});
