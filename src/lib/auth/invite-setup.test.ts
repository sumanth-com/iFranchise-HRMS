import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isPendingInviteSetupEmployee } from "@/lib/auth/invite-setup";

describe("isPendingInviteSetupEmployee", () => {
  it("flags draft employees with an open invitation", () => {
    for (const accountStatus of ["invited", "invitation_pending", "invitation_accepted"]) {
      assert.equal(
        isPendingInviteSetupEmployee({ employmentStatus: "draft", accountStatus }),
        true,
      );
    }
  });

  it("does not flag activated or exited employees", () => {
    assert.equal(
      isPendingInviteSetupEmployee({ employmentStatus: "active", accountStatus: "active" }),
      false,
    );
    assert.equal(
      isPendingInviteSetupEmployee({ employmentStatus: "probation", accountStatus: "invitation_pending" }),
      false,
    );
    assert.equal(
      isPendingInviteSetupEmployee({ employmentStatus: "resigned", accountStatus: "invitation_pending" }),
      false,
    );
  });

  it("does not flag draft employees whose account is not an open invitation", () => {
    for (const accountStatus of ["active", "draft", "inactive", "suspended", null]) {
      assert.equal(
        isPendingInviteSetupEmployee({ employmentStatus: "draft", accountStatus }),
        false,
      );
    }
  });
});
