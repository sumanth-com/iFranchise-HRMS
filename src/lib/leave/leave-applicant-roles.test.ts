import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isHrLeaveApplicant } from "./leave-applicant-roles";

describe("isHrLeaveApplicant", () => {
  it("matches HR and super admin role codes", () => {
    assert.equal(isHrLeaveApplicant(["employee"]), false);
    assert.equal(isHrLeaveApplicant(["manager"]), false);
    assert.equal(isHrLeaveApplicant(["hr_executive"]), true);
    assert.equal(isHrLeaveApplicant(["hr_admin"]), true);
    assert.equal(isHrLeaveApplicant(["super_admin"]), true);
  });
});
