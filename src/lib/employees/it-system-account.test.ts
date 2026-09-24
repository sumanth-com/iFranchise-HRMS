import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  IT_SYSTEM_ACCOUNT_CODE,
  IT_SYSTEM_ACCOUNT_EMAIL,
  isItSystemAccount,
} from "@/lib/employees/it-system-account";

describe("IT system account identity", () => {
  it("matches by email (case-insensitive)", () => {
    assert.equal(isItSystemAccount({ email: IT_SYSTEM_ACCOUNT_EMAIL }), true);
    assert.equal(isItSystemAccount({ email: "IT@IFRANCHISE.IN" }), true);
    assert.equal(isItSystemAccount({ email: " it@ifranchise.in " }), true);
  });

  it("matches by employee code", () => {
    assert.equal(
      isItSystemAccount({ employeeCode: IT_SYSTEM_ACCOUNT_CODE }),
      true,
    );
    assert.equal(
      isItSystemAccount({ employee_code: IT_SYSTEM_ACCOUNT_CODE }),
      true,
    );
  });

  it("does not match normal employees", () => {
    assert.equal(
      isItSystemAccount({
        email: "hr@ifranchise.in",
        employeeCode: "IF2026001",
      }),
      false,
    );
    assert.equal(isItSystemAccount({ email: null, employeeCode: null }), false);
  });
});
