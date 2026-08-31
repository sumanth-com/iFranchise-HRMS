import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  assertLeaveApprovalEmailHtml,
  renderLeaveApprovalRequestEmail,
} from "@/lib/approvals/email-templates";
import type { ApprovalRequestSummary } from "@/lib/approvals/types";

const summary: ApprovalRequestSummary = {
  organizationId: "org-1",
  subject: "Leave request awaiting approval",
  heading: "Leave request from Ada Lovelace",
  employeeName: "Ada Lovelace",
  detailRows: [
    { label: "Employee name", value: "Ada Lovelace" },
    { label: "Leave type", value: "Casual Leave" },
    { label: "Start date", value: "1 Sep 2026" },
    { label: "End date", value: "2 Sep 2026" },
    { label: "Duration", value: "2 days" },
    { label: "Reason", value: "Family event" },
  ],
  reason: "Family event",
  status: "pending",
  isPending: true,
  leaveHighlight: {
    leaveType: "Casual Leave",
    startDate: "1 Sep 2026",
    endDate: "2 Sep 2026",
    duration: "2 days",
    statusLabel: "Pending approval",
  },
};

describe("leave approval email template", () => {
  it("includes only Accept Leave and Reject Leave actions", () => {
    const html = renderLeaveApprovalRequestEmail({
      summary,
      approverName: "HR Admin",
      approveUrl: "https://example.com/approval/token?action=approve",
      rejectUrl: "https://example.com/approval/token?action=reject",
      expiresInHours: 48,
    });

    assert.match(html, /Accept Leave/);
    assert.match(html, /Reject Leave/);
    assert.doesNotMatch(html, /View Details/i);
    assert.equal((html.match(/class="email-btn"/g) ?? []).length, 2);
    assert.doesNotThrow(() => assertLeaveApprovalEmailHtml(html));
  });

  it("includes employee leave details and reason", () => {
    const html = renderLeaveApprovalRequestEmail({
      summary,
      approverName: "CEO",
      approveUrl: "https://example.com/a",
      rejectUrl: "https://example.com/r",
      expiresInHours: 24,
    });

    assert.match(html, /Ada Lovelace/);
    assert.match(html, /Casual Leave/);
    assert.match(html, /1 Sep 2026/);
    assert.match(html, /2 Sep 2026/);
    assert.match(html, /2 days/);
    assert.match(html, /Family event/);
  });
});
