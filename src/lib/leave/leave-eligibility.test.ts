import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isLeaveTypeAllowedForBand,
  leaveBalanceCardCodesForBand,
  resolveLeaveEligibilityBand,
} from "@/lib/leave/leave-eligibility";

describe("leave eligibility band", () => {
  it("gives full-time confirmed employees CL, EL, and OH", () => {
    const band = resolveLeaveEligibilityBand({
      employmentStatus: "active",
      employmentTypeCode: "FULL_TIME",
      isFullTime: true,
    });
    assert.equal(band, "full_time_confirmed");
    assert.equal(isLeaveTypeAllowedForBand("EL", band), true);
    assert.equal(isLeaveTypeAllowedForBand("OH", band), true);
    assert.deepEqual(leaveBalanceCardCodesForBand(band), ["CL", "EL", "OH"]);
  });

  it("restricts intern employment types to Casual Leave", () => {
    const band = resolveLeaveEligibilityBand({
      employmentStatus: "active",
      employmentTypeCode: "INTERN",
      isFullTime: false,
    });
    assert.equal(band, "cl_only");
    assert.equal(isLeaveTypeAllowedForBand("CL", band), true);
    assert.equal(isLeaveTypeAllowedForBand("EL", band), false);
    assert.equal(isLeaveTypeAllowedForBand("OH", band), false);
    assert.deepEqual(leaveBalanceCardCodesForBand(band), ["CL"]);
  });

  it("restricts probation employees to Casual Leave", () => {
    const band = resolveLeaveEligibilityBand({
      employmentStatus: "probation",
      employmentTypeCode: "FULL_TIME",
      isFullTime: true,
    });
    assert.equal(band, "cl_only");
    assert.equal(isLeaveTypeAllowedForBand("EL", band), false);
  });
});
