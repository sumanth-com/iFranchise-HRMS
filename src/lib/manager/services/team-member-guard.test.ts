import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { assertTeamMember } from "./team-queries";

describe("assertTeamMember", () => {
  it("allows assigned team members", () => {
    assert.doesNotThrow(() => assertTeamMember(["a", "b"], "b"));
  });

  it("rejects another manager's team member and unrelated employees", () => {
    assert.throws(
      () => assertTeamMember(["team-a"], "other-manager-member"),
      /reporting hierarchy/,
    );
    assert.throws(() => assertTeamMember([], "unrelated"), /reporting hierarchy/);
  });
});
