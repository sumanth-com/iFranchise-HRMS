import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildEmployeePaymentTimeline } from "@/lib/employee/services/employee-payment-timeline";

describe("employee payment timeline", () => {
  const octoberPayroll = {
    payroll_status: "processed" as const,
    created_at: "2026-10-01T04:30:00.000Z",
    processed_at: "2026-10-01T04:30:00.000Z",
    approved_at: null,
  };

  it("ticks salary credit after the 2nd and always dates generation on the 2nd", () => {
    const timeline = buildEmployeePaymentTimeline({
      payroll: octoberPayroll,
      emailSentAt: "2026-11-04T11:21:00.000Z",
      publishedAt: "2026-11-04T18:30:00.000Z",
      salaryCreditDate: "2026-11-02",
      payrollLifecycle: { itemStatus: "sent", sentAt: "2026-11-04T11:21:00.000Z" },
      now: new Date("2026-11-04T12:00:00.000Z"),
    });

    const [credited, generated, reviewed, sent] = timeline.stages;
    assert.equal(credited.key, "credited");
    assert.equal(credited.done, true);
    assert.equal(credited.at, "2026-11-02");
    assert.equal(generated.key, "generated");
    assert.equal(generated.done, true);
    assert.equal(generated.at, "2026-11-02");
    assert.equal(reviewed.key, "hr_approved");
    assert.equal(reviewed.done, true);
    assert.equal(reviewed.at, "2026-11-03");
    assert.equal(sent.key, "released");
    assert.equal(sent.done, true);
    assert.equal(sent.at, "2026-11-04T11:21:00.000Z");
  });

  it("ticks payroll generated on the 2nd even when the run is still draft", () => {
    const timeline = buildEmployeePaymentTimeline({
      payroll: {
        ...octoberPayroll,
        payroll_status: "draft",
        processed_at: null,
      },
      emailSentAt: null,
      publishedAt: "2026-11-04T18:30:00.000Z",
      salaryCreditDate: "2026-11-02",
      now: new Date("2026-11-04T12:00:00.000Z"),
    });

    assert.equal(timeline.stages[1]?.key, "generated");
    assert.equal(timeline.stages[1]?.done, true);
    assert.equal(timeline.stages[1]?.at, "2026-11-02");
  });

  it("keeps salary credit in progress until the 2nd ends", () => {
    const timeline = buildEmployeePaymentTimeline({
      payroll: octoberPayroll,
      emailSentAt: null,
      publishedAt: "2026-11-04T18:30:00.000Z",
      salaryCreditDate: "2026-11-02",
      now: new Date("2026-11-02T12:00:00.000Z"),
    });

    assert.equal(timeline.stages[0]?.done, false);
    assert.equal(timeline.stages[0]?.at, null);
    assert.equal(timeline.stages[1]?.done, true);
    assert.equal(timeline.stages[1]?.at, "2026-11-02");
    assert.equal(timeline.stages[2]?.done, false);
    assert.equal(timeline.stages[3]?.done, false);
  });

  it("uses the real HR approval timestamp when present", () => {
    const timeline = buildEmployeePaymentTimeline({
      payroll: {
        ...octoberPayroll,
        payroll_status: "approved",
        approved_at: "2026-11-03T05:15:00.000Z",
      },
      emailSentAt: null,
      publishedAt: "2026-11-04T18:30:00.000Z",
      salaryCreditDate: "2026-11-02",
      payrollLifecycle: { itemStatus: "reviewed" },
      now: new Date("2026-11-04T12:00:00.000Z"),
    });

    assert.equal(timeline.stages[2]?.done, true);
    assert.equal(timeline.stages[2]?.at, "2026-11-03T05:15:00.000Z");
    assert.equal(timeline.stages[2]?.precision, "datetime");
    assert.equal(timeline.stages[3]?.done, false);
  });
});
