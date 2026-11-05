import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatDesignationDisplay } from "@/lib/employees/designation-display";

describe("formatDesignationDisplay", () => {
  it("uses the live designation title even for Sumanth", () => {
    assert.equal(
      formatDesignationDisplay("Software Development Engineer (SDE)", {
        person: {
          employeeCode: "IF2026009",
          firstName: "Gangaram",
          lastName: "Sumanth Reddy",
        },
      }),
      "Software Development Engineer (SDE)",
    );
  });

  it("does not keep a hardcoded intern title after HR changes it", () => {
    assert.equal(
      formatDesignationDisplay("Software Development Engineer (SDE)", {
        person: {
          employeeCode: "IF2026009",
          firstName: "Sumanth",
          lastName: "Reddy",
        },
      }),
      "Software Development Engineer (SDE)",
    );
  });

  it("still polishes known short titles when that is what HR saved", () => {
    assert.equal(formatDesignationDisplay("CEO"), "Chief Executive Officer");
    assert.equal(
      formatDesignationDisplay("Web Development Intern"),
      "Web Development Intern",
    );
  });
});
