import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isSamePasswordAuthError,
  mapSupabaseAuthError,
} from "@/lib/auth/errors";

describe("mapSupabaseAuthError", () => {
  it("maps expired/used reset tokens to RESET_LINK_INVALID", () => {
    assert.equal(
      mapSupabaseAuthError("Email link is invalid or has expired"),
      "RESET_LINK_INVALID",
    );
    assert.equal(mapSupabaseAuthError("otp_expired"), "RESET_LINK_INVALID");
    assert.equal(
      mapSupabaseAuthError("invalid flow state, flow state has expired"),
      "RESET_LINK_INVALID",
    );
    assert.equal(
      mapSupabaseAuthError("Auth code has already been used"),
      "RESET_LINK_INVALID",
    );
  });
});

describe("isSamePasswordAuthError", () => {
  it("detects unchanged-password Auth responses", () => {
    assert.equal(
      isSamePasswordAuthError(
        "New password should be different from the old password.",
      ),
      true,
    );
    assert.equal(isSamePasswordAuthError("Invalid login credentials"), false);
  });
});
