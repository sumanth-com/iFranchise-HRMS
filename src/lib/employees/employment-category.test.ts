import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  employmentCategoryTypeCodes,
  matchesEmploymentCategoryFilter,
  parseEmploymentCategoryFilter,
} from "@/lib/employees/employment-category";

describe("employment category filters", () => {
  it("parses known pills and defaults unknown values to all", () => {
    assert.equal(parseEmploymentCategoryFilter("internship"), "internship");
    assert.equal(parseEmploymentCategoryFilter("probation"), "probation");
    assert.equal(parseEmploymentCategoryFilter("full_time"), "full_time");
    assert.equal(parseEmploymentCategoryFilter("former"), "former");
    assert.equal(parseEmploymentCategoryFilter("nope"), "all");
  });

  it("maps each pill to a single employment-type code", () => {
    assert.deepEqual(employmentCategoryTypeCodes("probation"), ["PROBATION"]);
    assert.deepEqual(employmentCategoryTypeCodes("internship"), ["INTERN"]);
    assert.deepEqual(employmentCategoryTypeCodes("full_time"), ["FULL_TIME"]);
  });

  it("former pill matches resigned/terminated status only", () => {
    assert.equal(
      matchesEmploymentCategoryFilter("former", { employmentStatus: "resigned" }),
      true,
    );
    assert.equal(
      matchesEmploymentCategoryFilter("former", { employmentStatus: "terminated" }),
      true,
    );
    assert.equal(
      matchesEmploymentCategoryFilter("former", { employmentStatus: "active" }),
      false,
    );
  });

  it("does not mix internship into probation", () => {
    assert.equal(
      matchesEmploymentCategoryFilter("probation", { employmentTypeCode: "INTERN" }),
      false,
    );
    assert.equal(
      matchesEmploymentCategoryFilter("probation", { employmentTypeCode: "PROBATION" }),
      true,
    );
    assert.equal(
      matchesEmploymentCategoryFilter("internship", { employmentTypeCode: "INTERN" }),
      true,
    );
    assert.equal(
      matchesEmploymentCategoryFilter("internship", {
        employmentTypeCode: "INTERNSHIP",
      }),
      true,
    );
    assert.equal(
      matchesEmploymentCategoryFilter("internship", { employmentTypeCode: "PROBATION" }),
      false,
    );
  });
});
