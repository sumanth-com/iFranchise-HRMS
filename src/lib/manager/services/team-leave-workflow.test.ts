import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveManagerLeaveWorkflowStatus } from "@/lib/manager/services/team-leave-workflow";

describe("resolveManagerLeaveWorkflowStatus", () => {
  it("maps canonical leave_status for first-wins approval", () => {
    assert.equal(resolveManagerLeaveWorkflowStatus("pending", []), "pending");
    assert.equal(resolveManagerLeaveWorkflowStatus("approved", []), "completed");
    assert.equal(
      resolveManagerLeaveWorkflowStatus("rejected", [
        { approvalLevel: 1, approvalStatus: "rejected" },
      ]),
      "rejected_by_manager",
    );
  });

  it("does not invent sent_to_hr while leave_status is still pending", () => {
    assert.equal(
      resolveManagerLeaveWorkflowStatus("pending", [
        { approvalLevel: 1, approvalStatus: "approved" },
        { approvalLevel: 2, approvalStatus: "pending" },
      ]),
      "pending",
    );
  });
});
