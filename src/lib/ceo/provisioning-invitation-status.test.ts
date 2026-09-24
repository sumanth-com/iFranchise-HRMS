import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { deriveProvisioningInvitationStatus } from "@/lib/ceo/provisioning-invitation-status";

describe("deriveProvisioningInvitationStatus", () => {
  it("marks linked accounts with login activity as ACTIVE", () => {
    assert.equal(
      deriveProvisioningInvitationStatus({
        account_status: "invitation_pending",
        user_id: "user-1",
        first_login_at: null,
        last_login_at: "2026-09-24T05:00:00.000Z",
      }),
      "active",
    );

    assert.equal(
      deriveProvisioningInvitationStatus({
        account_status: "invitation_pending",
        user_id: "user-1",
        first_login_at: "2026-09-24T05:00:00.000Z",
        last_login_at: null,
      }),
      "active",
    );
  });

  it("keeps invites without login as PENDING", () => {
    assert.equal(
      deriveProvisioningInvitationStatus({
        account_status: "invitation_pending",
        user_id: "user-1",
        first_login_at: null,
        last_login_at: null,
        invitation_sent_at: new Date().toISOString(),
      }),
      "pending",
    );
  });

  it("marks fully active accounts as ACTIVE", () => {
    assert.equal(
      deriveProvisioningInvitationStatus({
        account_status: "active",
        user_id: "user-1",
        first_login_at: "2026-08-01T00:00:00.000Z",
      }),
      "active",
    );
  });
});
