import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  splitMonthlyGross,
  statutoryEsi,
  statutoryPf,
  totalStatutoryDeductions,
} from "@/lib/payroll/salary-structure-breakdown";

describe("salary structure breakdown", () => {
  it("splits monthly gross into 50/25/15/10 and totals 100%", () => {
    const split = splitMonthlyGross(50_000);
    assert.equal(split.basic, 25_000);
    assert.equal(split.hra, 12_500);
    assert.equal(split.special, 7_500);
    assert.equal(split.lta, 5_000);
    assert.equal(split.basic + split.hra + split.special + split.lta, 50_000);
  });

  it("adjusts LTA so rounded parts still equal gross", () => {
    const gross = 33_333;
    const split = splitMonthlyGross(gross);
    assert.equal(split.basic + split.hra + split.special + split.lta, 33_333);
  });

  it("caps employee PF at 12% of ₹15,000", () => {
    assert.equal(statutoryPf(25_000), 1_800);
    assert.equal(statutoryPf(10_000), 1_200);
  });

  it("applies ESI only up to the statutory gross ceiling", () => {
    assert.equal(statutoryEsi(20_000), 150);
    assert.equal(statutoryEsi(21_001), 0);
  });

  it("sums deductions for the live net salary", () => {
    assert.equal(
      totalStatutoryDeductions({
        pf: 1800,
        esi: 150,
        tds: 500,
        professionalTax: 200,
        other: 50,
      }),
      2700,
    );
  });
});
