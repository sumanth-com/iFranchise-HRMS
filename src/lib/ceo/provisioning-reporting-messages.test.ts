import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  bulkReportingContactsSuccessMessage,
  reportingContactsSuccessMessage,
} from "@/lib/ceo/provisioning-reporting-messages";

describe("reportingContactsSuccessMessage", () => {
  it("describes manager-only, HR-only, and both updates", () => {
    assert.equal(
      reportingContactsSuccessMessage({ managerChanged: true, hrChanged: false }),
      "Manager assigned successfully.",
    );
    assert.equal(
      reportingContactsSuccessMessage({ managerChanged: false, hrChanged: true }),
      "HR contact updated successfully.",
    );
    assert.equal(
      reportingContactsSuccessMessage({ managerChanged: true, hrChanged: true }),
      "Manager and HR contact updated successfully.",
    );
  });
});

describe("bulkReportingContactsSuccessMessage", () => {
  it("includes the employee count for each update type", () => {
    assert.equal(
      bulkReportingContactsSuccessMessage({
        managerChanged: true,
        hrChanged: false,
        employeeCount: 3,
      }),
      "Manager assigned to 3 employees successfully.",
    );
    assert.equal(
      bulkReportingContactsSuccessMessage({
        managerChanged: false,
        hrChanged: true,
        employeeCount: 1,
      }),
      "HR contact updated for 1 employee successfully.",
    );
    assert.equal(
      bulkReportingContactsSuccessMessage({
        managerChanged: true,
        hrChanged: true,
        employeeCount: 5,
      }),
      "Manager and HR contact updated for 5 employees successfully.",
    );
  });
});
