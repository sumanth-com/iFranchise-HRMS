import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isHrLeaveApplicant } from "@/lib/leave/leave-applicant-roles";
import { requiresCeoLeaveApproval } from "@/lib/approvals/executive-request-routing";
import {
  canActorDecideLeaveRequest,
  canManagerActOnTeamLeaveApproval,
  isCeoLeaveApprover,
  isEligibleActiveCeoLeaveApproverEmployee,
} from "./leave-approval-auth";
import type { UserProfile } from "@/types/auth";

function profile(partial: {
  employeeId: string;
  roleCode?: string;
  permissionCodes?: string[];
}): UserProfile {
  return {
    userId: `user-${partial.employeeId}`,
    email: `${partial.employeeId}@example.com`,
    employee: {
      id: partial.employeeId,
      organizationId: "org-1",
    } as UserProfile["employee"],
    organization: {} as UserProfile["organization"],
    roles: partial.roleCode
      ? [
          {
            id: "r1",
            name: partial.roleCode,
            code: partial.roleCode,
            isSystemRole: true,
            status: "active",
          },
        ]
      : [],
    permissions: [],
    permissionCodes: partial.permissionCodes ?? [],
  };
}

describe("canActorDecideLeaveRequest", () => {
  const base = {
    applicantEmployeeId: "emp-1",
    leaveStatus: "pending",
    pendingLevel: 1,
    executiveApplicant: false,
  };

  it("allows the assigned reporting manager for their team member", () => {
    assert.equal(
      canActorDecideLeaveRequest({
        ...base,
        profile: profile({ employeeId: "mgr-1", roleCode: "manager" }),
        pendingApproverEmployeeId: "mgr-1",
      }),
      true,
    );
  });

  it("rejects an unassigned manager", () => {
    assert.equal(
      canActorDecideLeaveRequest({
        ...base,
        profile: profile({ employeeId: "mgr-2", roleCode: "manager" }),
        pendingApproverEmployeeId: "hr-1",
      }),
      false,
    );
  });

  it("allows HR and CEO without being the assigned step owner", () => {
    assert.equal(
      canActorDecideLeaveRequest({
        ...base,
        profile: profile({ employeeId: "hr-1", roleCode: "hr_admin" }),
        pendingApproverEmployeeId: "mgr-1",
      }),
      true,
    );
    assert.equal(
      canActorDecideLeaveRequest({
        ...base,
        profile: profile({
          employeeId: "ceo-1",
          roleCode: "ceo",
          permissionCodes: ["portal.ceo.access"],
        }),
        pendingApproverEmployeeId: "mgr-1",
      }),
      true,
    );
  });

  it("rejects self-approval", () => {
    assert.equal(
      canActorDecideLeaveRequest({
        ...base,
        applicantEmployeeId: "mgr-1",
        profile: profile({ employeeId: "mgr-1", roleCode: "manager" }),
        pendingApproverEmployeeId: "mgr-1",
      }),
      false,
    );
  });

  it("blocks non-CEO managers from executive applicant leave (CEO/HR decide)", () => {
    assert.equal(
      canActorDecideLeaveRequest({
        ...base,
        executiveApplicant: true,
        profile: profile({ employeeId: "mgr-1", roleCode: "manager" }),
        pendingApproverEmployeeId: "mgr-1",
      }),
      false,
    );
    assert.equal(
      canActorDecideLeaveRequest({
        ...base,
        executiveApplicant: true,
        profile: profile({
          employeeId: "ceo-1",
          roleCode: "ceo",
          permissionCodes: ["portal.ceo.access"],
        }),
        pendingApproverEmployeeId: "ceo-1",
      }),
      true,
    );
  });
});

describe("canManagerActOnTeamLeaveApproval (Sumanth / executive pending pattern)", () => {
  it("keeps normal team leave actionable for the assigned manager", () => {
    assert.equal(
      canManagerActOnTeamLeaveApproval({
        profile: profile({ employeeId: "mgr-1", roleCode: "manager" }),
        leaveStatus: "pending",
        executiveApplicant: false,
        hasOwnPendingStep: true,
      }),
      true,
    );
  });

  it("does not let a non-CEO manager act on CEO-routed executive leave", () => {
    assert.equal(
      canManagerActOnTeamLeaveApproval({
        profile: profile({ employeeId: "mgr-1", roleCode: "manager" }),
        leaveStatus: "pending",
        executiveApplicant: true,
        hasOwnPendingStep: true,
      }),
      false,
    );
  });

  it("lets an assigned CEO leave approver act on executive leave from Manager Team Leave", () => {
    // Regression: previously `!executiveApplicant && ownPending` forced
    // canAct=false even when the reporting manager was also a CEO assignee
    // (e.g. Abdul Khader on IF2026009 / Sumanth pending leave).
    assert.equal(
      canManagerActOnTeamLeaveApproval({
        profile: profile({
          employeeId: "ceo-1",
          roleCode: "ceo",
          permissionCodes: ["portal.ceo.access"],
        }),
        leaveStatus: "pending",
        executiveApplicant: true,
        hasOwnPendingStep: true,
      }),
      true,
    );
  });

  it("requires an own pending step even for CEO managers", () => {
    assert.equal(
      canManagerActOnTeamLeaveApproval({
        profile: profile({
          employeeId: "ceo-1",
          roleCode: "ceo",
          permissionCodes: ["portal.ceo.access"],
        }),
        leaveStatus: "pending",
        executiveApplicant: true,
        hasOwnPendingStep: false,
      }),
      false,
    );
  });
});

describe("isEligibleActiveCeoLeaveApproverEmployee", () => {
  it("accepts active portal-visible CEO profiles", () => {
    assert.equal(
      isEligibleActiveCeoLeaveApproverEmployee({
        status: "active",
        employment_status: "active",
        email: "ceo@ifranchise.in",
        app_hidden_at: null,
        deleted_at: null,
      }),
      true,
    );
  });

  it("keeps the IT system operator eligible as a CEO leave assignee", () => {
    // Regression: IT (it@ifranchise.in) is a portal.ceo leave assignee for
    // executive leave (e.g. Sumanth IF2026009). Excluding the IT system account
    // from active CEO assignees would drop its pending step and empty its
    // CEO Approvals queue even though the request is still pending.
    assert.equal(
      isEligibleActiveCeoLeaveApproverEmployee({
        status: "active",
        employment_status: "active",
        email: "it@ifranchise.in",
        app_hidden_at: null,
        deleted_at: null,
      }),
      true,
    );
  });

  it("rejects app-hidden shells so they are not assigned pending executive leave", () => {
    // Regression: HemaCEO (EMP-2026028 / hello.codegai@gmail.com) stayed in
    // filterActiveCeoEmployeeIds despite app_hidden_at, so executive leave was
    // assigned to an account that cannot open CEO Approvals.
    assert.equal(
      isEligibleActiveCeoLeaveApproverEmployee({
        status: "active",
        employment_status: "active",
        email: "hello.codegai@gmail.com",
        app_hidden_at: "2026-08-31T16:55:13.71684+00:00",
        deleted_at: null,
      }),
      false,
    );
    assert.equal(
      isEligibleActiveCeoLeaveApproverEmployee({
        status: "active",
        employment_status: "active",
        email: "hello.codegai@gmail.com",
        app_hidden_at: null,
        deleted_at: null,
      }),
      false,
    );
  });
});

describe("IT / HR / multi-portal executive leave visibility policy", () => {
  it("treats super_admin applicants as CEO-routed (still parallel HR + CEO queues)", () => {
    // Sumanth IF2026009 is super_admin → createApprovalSteps assigns CEO L1 only.
    // HR Team Leave now lists these rows so HR can first-wins decide; CEO Approvals
    // remains the parallel queue for assigned CEO leave approvers.
    assert.equal(isHrLeaveApplicant(["super_admin"]), true);
    assert.equal(requiresCeoLeaveApproval(["super_admin"]), true);
  });

  it("lets IT-style portal.ceo actors decide executive leave without a ceo role row", () => {
    // it@ifranchise.in holds portal.ceo.access via it_multi_portal_access / super_admin
    // and is assigned a pending leave_approvals step for CEO-routed leave.
    const itProfile = profile({
      employeeId: "it-1",
      roleCode: "super_admin",
      permissionCodes: ["portal.ceo.access", "leave.approve", "portal.hr.access"],
    });
    assert.equal(isCeoLeaveApprover(itProfile), true);
    assert.equal(
      canActorDecideLeaveRequest({
        applicantEmployeeId: "sumanth-1",
        leaveStatus: "pending",
        pendingLevel: 1,
        pendingApproverEmployeeId: "it-1",
        executiveApplicant: true,
        profile: itProfile,
      }),
      true,
    );
  });

  it("lets HR (Ekta) decide CEO-routed executive leave without an own approval step", () => {
    // Regression: Sumanth IF2026009 pending CL — Ekta has no leave_approvals row,
    // but HR Team Leave must still allow first-wins approve/reject while CEO
    // Approvals keeps the same request visible until someone acts.
    assert.equal(
      canActorDecideLeaveRequest({
        applicantEmployeeId: "sumanth-1",
        leaveStatus: "pending",
        pendingLevel: 1,
        pendingApproverEmployeeId: "ceo-1",
        executiveApplicant: true,
        profile: profile({ employeeId: "hr-1", roleCode: "hr_admin" }),
      }),
      true,
    );
  });

  it("still blocks non-HR non-CEO actors from CEO-routed executive leave", () => {
    assert.equal(
      canActorDecideLeaveRequest({
        applicantEmployeeId: "sumanth-1",
        leaveStatus: "pending",
        pendingLevel: 1,
        pendingApproverEmployeeId: "mgr-1",
        executiveApplicant: true,
        profile: profile({ employeeId: "mgr-1", roleCode: "manager" }),
      }),
      false,
    );
  });
});
