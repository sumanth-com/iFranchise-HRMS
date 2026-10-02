import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { applyIfscBranch, isStoredBankBranch } from "@/lib/payroll/services/ifsc-bank-names";
import {
  displaySalaryBankDetails,
  formatCurrency,
  formatReadableAccountNumber,
  formatReadableIfsc,
} from "@/lib/payroll/services/payroll-utils";

describe("payroll money display", () => {
  it("shows salary amounts with exactly two decimal places", () => {
    assert.equal(formatCurrency(25000.01), "₹25,000.01");
    assert.equal(formatCurrency(1666.67), "₹1,666.67");
    assert.equal(formatCurrency(48133.33), "₹48,133.33");
    assert.equal(formatCurrency(25000), "₹25,000.00");
  });
});

describe("bank branch display", () => {
  it("keeps a saved branch and does not invent one", () => {
    const displayed = displaySalaryBankDetails({
      bankName: "State Bank of India",
      ifscCode: "sbin0001320",
      branchName: "Madhapur",
    });
    assert.equal(displayed.bankName, "State Bank of India");
    assert.equal(displayed.branchName, "Madhapur");
    assert.equal(displayed.ifscCode, "SBIN0001320");
  });

  it("fills only a missing branch from the IFSC lookup result", () => {
    const kept = applyIfscBranch(
      { bankName: "HDFC Bank", ifscCode: "HDFC0007642", branchName: "Banjara Hills" },
      { bankName: "HDFC Bank", branchName: "Some Other Branch" },
    );
    assert.equal(kept.branchName, "Banjara Hills");

    const filled = applyIfscBranch(
      { bankName: "imported", ifscCode: "SBIN0000834", branchName: null },
      { bankName: "State Bank of India", branchName: "Dhone" },
    );
    assert.equal(filled.bankName, "State Bank of India");
    assert.equal(filled.branchName, "Dhone");
    assert.equal(isStoredBankBranch(null), false);
    assert.equal(isStoredBankBranch("Dhone"), true);
  });

  it("formats account numbers and IFSC codes for reading", () => {
    assert.equal(formatReadableAccountNumber("41992341026"), "4199 2341 026");
    assert.equal(formatReadableIfsc("sbin0000834"), "SBIN0000834");
    assert.equal(formatReadableAccountNumber(""), "—");
    assert.equal(formatReadableIfsc(null), "—");
  });
});
