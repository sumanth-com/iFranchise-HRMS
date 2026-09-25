import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ACTIVE_EMPLOYMENT_STATUSES,
  FORMER_EMPLOYMENT_STATUSES,
  isActiveEmploymentStatus,
  isFormerEmploymentStatus,
} from "@/lib/employees/employment-eligibility";

describe("employment eligibility", () => {
  it("treats active/probation/on_leave as active workforce", () => {
    for (const status of ACTIVE_EMPLOYMENT_STATUSES) {
      assert.equal(isActiveEmploymentStatus(status), true);
      assert.equal(isFormerEmploymentStatus(status), false);
    }
  });

  it("treats resigned/terminated as former", () => {
    for (const status of FORMER_EMPLOYMENT_STATUSES) {
      assert.equal(isFormerEmploymentStatus(status), true);
      assert.equal(isActiveEmploymentStatus(status), false);
    }
  });

  it("does not treat draft/suspended as active or former workforce", () => {
    assert.equal(isActiveEmploymentStatus("draft"), false);
    assert.equal(isFormerEmploymentStatus("draft"), false);
    assert.equal(isActiveEmploymentStatus("suspended"), false);
    assert.equal(isFormerEmploymentStatus("suspended"), false);
  });
});
