import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { UserProfile } from "@/types/auth";
import { returnAsset } from "@/lib/assets/services/asset-mutations";
import { listEmployeeAssets } from "@/lib/assets/services/asset-queries";
import { autoGenerateLetterForEmployee } from "@/lib/documents/services/document-mutations";
import { getExitSettings } from "@/lib/exit/services/exit-settings";
import {
  emptyToNull,
  fromHrms,
  isEmployeeOnly,
  isHrAdmin,
} from "@/lib/exit/services/exit-utils";
import type {
  AssetReturnDecisionValues,
  ClearanceDecisionValues,
  InterviewFormValues,
  ResignationDecisionValues,
  ResignationFormValues,
  SettlementFormValues,
} from "@/lib/validations/exit";
import type { ExitStatus } from "@/types/exit";

async function addTimeline(
  supabase: AuthSupabaseClient,
  organizationId: string,
  resignationId: string,
  userId: string,
  eventType: string,
  title: string,
  description?: string | null,
) {
  await fromHrms(supabase, "exit_timeline").insert({
    organization_id: organizationId,
    resignation_id: resignationId,
    event_type: eventType,
    title,
    description: description ?? null,
    created_by: userId,
  });
}

async function setResignationStatus(
  supabase: AuthSupabaseClient,
  resignationId: string,
  userId: string,
  exitStatus: ExitStatus,
  extra: Record<string, unknown> = {},
) {
  const { error } = await fromHrms(supabase, "exit_resignations")
    .update({
      exit_status: exitStatus,
      updated_by: userId,
      ...extra,
    })
    .eq("id", resignationId);
  if (error) throw new Error(error.message);
}

async function seedClearanceAndAssets(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  resignationId: string,
  employeeId: string,
) {
  const organizationId = profile.employee.organizationId;
  const settings = await getExitSettings(supabase, organizationId);

  await fromHrms(supabase, "exit_clearance_items").insert(
    settings.clearanceDepartments.map((dept, index) => ({
      organization_id: organizationId,
      resignation_id: resignationId,
      department_key: dept.key,
      department_label: dept.label,
      clearance_status: "pending",
      sort_order: index,
      status: "active",
      created_by: profile.userId,
      updated_by: profile.userId,
    })),
  );

  const assignments = await listEmployeeAssets(supabase, organizationId, employeeId);
  const active = assignments.filter((a) => a.assignmentStatus === "active");

  if (active.length > 0) {
    await fromHrms(supabase, "exit_asset_returns").insert(
      active.map((a) => ({
        organization_id: organizationId,
        resignation_id: resignationId,
        asset_id: a.assetId,
        assignment_id: a.id,
        asset_code: a.assetCode,
        asset_name: a.assetName,
        category_name: a.categoryName,
        return_status: "pending",
        recovery_amount: 0,
        status: "active",
        created_by: profile.userId,
        updated_by: profile.userId,
      })),
    );
  }
}

async function ensureSettlementDraft(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  resignationId: string,
  employeeId: string,
) {
  const organizationId = profile.employee.organizationId;

  const { data: existing } = await fromHrms(supabase, "exit_settlements")
    .select("id")
    .eq("resignation_id", resignationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: salary } = await fromHrms(supabase, "salary_structures")
    .select("gross_salary, net_salary")
    .eq("employee_id", employeeId)
    .is("deleted_at", null)
    .is("effective_to", null)
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: balances } = await fromHrms(supabase, "leave_balances")
    .select("balance_days")
    .eq("employee_id", employeeId)
    .is("deleted_at", null);

  const leaveDays = (balances ?? []).reduce(
    (sum: number, row: { balance_days?: number | null }) =>
      sum + Number(row.balance_days ?? 0),
    0,
  );

  const dailyRate = salary?.net_salary != null ? Number(salary.net_salary) / 30 : 0;
  const pendingSalary = salary?.net_salary != null ? Number(salary.net_salary) : 0;
  const leaveEncashment = Number((leaveDays * dailyRate).toFixed(2));

  const { data: assetRecovery } = await fromHrms(supabase, "exit_asset_returns")
    .select("recovery_amount")
    .eq("resignation_id", resignationId)
    .is("deleted_at", null);

  const assetDamageRecovery = (assetRecovery ?? []).reduce(
    (sum: number, row: { recovery_amount?: number | null }) =>
      sum + Number(row.recovery_amount ?? 0),
    0,
  );

  const netPayable = pendingSalary + leaveEncashment - assetDamageRecovery;

  const { data, error } = await fromHrms(supabase, "exit_settlements")
    .insert({
      organization_id: organizationId,
      resignation_id: resignationId,
      employee_id: employeeId,
      pending_salary: pendingSalary,
      leave_encashment: leaveEncashment,
      bonus: 0,
      reimbursements: 0,
      deductions: 0,
      asset_damage_recovery: assetDamageRecovery,
      net_payable: netPayable,
      leave_balance_days: leaveDays,
      settlement_status: "draft",
      status: "active",
      created_by: profile.userId,
      updated_by: profile.userId,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create settlement");
  return data.id;
}

async function maybeAdvanceAfterAssets(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  resignationId: string,
  employeeId: string,
) {
  const { data: blocking } = await fromHrms(supabase, "exit_asset_returns")
    .select("id")
    .eq("resignation_id", resignationId)
    .in("return_status", ["pending", "replacement_required"])
    .is("deleted_at", null)
    .limit(1);

  if (blocking && blocking.length > 0) return;

  await ensureSettlementDraft(supabase, profile, resignationId, employeeId);
  await setResignationStatus(supabase, resignationId, profile.userId, "settlement");
  await addTimeline(
    supabase,
    profile.employee.organizationId,
    resignationId,
    profile.userId,
    "settlement",
    "Final settlement ready",
    "All assets processed. Settlement draft generated.",
  );
}

async function completeExitIfReady(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  resignationId: string,
  employeeId: string,
) {
  const settings = await getExitSettings(supabase, profile.employee.organizationId);
  const organizationId = profile.employee.organizationId;

  if (settings.autoGenerateDocuments) {
    await autoGenerateLetterForEmployee(supabase, profile, {
      employeeId,
      letterType: "relieving_letter",
      sourceModule: "exit",
      sourceRecordId: resignationId,
      publishNow: true,
    });
    await autoGenerateLetterForEmployee(supabase, profile, {
      employeeId,
      letterType: "experience_letter",
      sourceModule: "exit",
      sourceRecordId: resignationId,
      publishNow: true,
    });
    await autoGenerateLetterForEmployee(supabase, profile, {
      employeeId,
      letterType: "settlement_letter",
      sourceModule: "exit",
      sourceRecordId: resignationId,
      publishNow: true,
    });
    await addTimeline(
      supabase,
      organizationId,
      resignationId,
      profile.userId,
      "documents",
      "Exit documents generated",
      "Relieving, experience, and settlement letters stored in employee documents.",
    );
  }

  const { data: resignation } = await fromHrms(supabase, "exit_resignations")
    .select("last_working_day")
    .eq("id", resignationId)
    .maybeSingle();

  if (settings.autoArchiveEmployee) {
    await fromHrms(supabase, "employees")
      .update({
        employment_status: "resigned",
        date_of_leaving: resignation?.last_working_day ?? new Date().toISOString().slice(0, 10),
        status: "inactive",
        updated_by: profile.userId,
      })
      .eq("id", employeeId)
      .eq("organization_id", organizationId);
  }

  await setResignationStatus(supabase, resignationId, profile.userId, "completed", {
    completed_at: new Date().toISOString(),
  });

  await addTimeline(
    supabase,
    organizationId,
    resignationId,
    profile.userId,
    "completed",
    "Exit completed",
    settings.autoArchiveEmployee
      ? "Employee marked as resigned / inactive."
      : "Exit process completed.",
  );
}

export async function submitResignation(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: ResignationFormValues,
): Promise<string> {
  const organizationId = profile.employee.organizationId;
  const employeeId = isEmployeeOnly(profile) ? profile.employee.id : input.employeeId;

  if (isEmployeeOnly(profile) && input.employeeId !== profile.employee.id) {
    throw new Error("You can only submit resignation for yourself");
  }

  const { data: employee, error: empError } = await fromHrms(supabase, "employees")
    .select("id, reporting_manager_id, employment_status")
    .eq("id", employeeId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (empError) throw new Error(empError.message);
  if (!employee) throw new Error("Employee not found");

  const { data: open } = await fromHrms(supabase, "exit_resignations")
    .select("id")
    .eq("employee_id", employeeId)
    .is("deleted_at", null)
    .not("exit_status", "in", '("completed","rejected","withdrawn")')
    .limit(1);

  if (open && open.length > 0) {
    throw new Error("An active resignation already exists for this employee");
  }

  const { data, error } = await fromHrms(supabase, "exit_resignations")
    .insert({
      organization_id: organizationId,
      employee_id: employeeId,
      resignation_date: input.resignationDate,
      last_working_day: input.lastWorkingDay,
      notice_period_days: input.noticePeriodDays,
      reason: input.reason,
      comments: emptyToNull(input.comments),
      exit_status: "submitted",
      manager_employee_id: employee.reporting_manager_id,
      status: "active",
      created_by: profile.userId,
      updated_by: profile.userId,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to submit resignation");

  await addTimeline(
    supabase,
    organizationId,
    data.id,
    profile.userId,
    "submitted",
    "Resignation submitted",
    input.reason,
  );

  return data.id;
}

export async function decideResignation(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: ResignationDecisionValues,
  stage: "manager" | "hr",
): Promise<void> {
  const organizationId = profile.employee.organizationId;

  const { data: row, error } = await fromHrms(supabase, "exit_resignations")
    .select("*")
    .eq("id", input.resignationId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!row) throw new Error("Resignation not found");

  if (input.decision === "reject") {
    await setResignationStatus(supabase, row.id, profile.userId, "rejected", {
      rejected_reason: emptyToNull(input.rejectedReason) ?? emptyToNull(input.remarks),
      ...(stage === "manager"
        ? {
            manager_acted_at: new Date().toISOString(),
            manager_remarks: emptyToNull(input.remarks),
          }
        : {
            hr_acted_at: new Date().toISOString(),
            hr_acted_by: profile.userId,
            hr_remarks: emptyToNull(input.remarks),
          }),
    });
    await addTimeline(
      supabase,
      organizationId,
      row.id,
      profile.userId,
      "rejected",
      `${stage === "manager" ? "Manager" : "HR"} rejected resignation`,
      input.rejectedReason ?? input.remarks,
    );
    return;
  }

  if (stage === "manager") {
    if (row.exit_status !== "submitted") throw new Error("Resignation is not awaiting manager approval");
    if (
      !isHrAdmin(profile) &&
      row.manager_employee_id &&
      row.manager_employee_id !== profile.employee.id
    ) {
      throw new Error("Only the reporting manager can approve this resignation");
    }

    await setResignationStatus(supabase, row.id, profile.userId, "manager_approved", {
      manager_acted_at: new Date().toISOString(),
      manager_remarks: emptyToNull(input.remarks),
    });
    await addTimeline(
      supabase,
      organizationId,
      row.id,
      profile.userId,
      "manager_approved",
      "Manager approved resignation",
      input.remarks,
    );
    return;
  }

  if (!["submitted", "manager_approved"].includes(row.exit_status)) {
    throw new Error("Resignation is not awaiting HR approval");
  }
  if (!isHrAdmin(profile)) throw new Error("Only HR can perform HR approval");

  await setResignationStatus(supabase, row.id, profile.userId, "clearance", {
    hr_acted_at: new Date().toISOString(),
    hr_acted_by: profile.userId,
    hr_remarks: emptyToNull(input.remarks),
  });

  await seedClearanceAndAssets(supabase, profile, row.id, row.employee_id);

  await autoGenerateLetterForEmployee(supabase, profile, {
    employeeId: row.employee_id,
    letterType: "resignation_acceptance_letter",
    sourceModule: "exit",
    sourceRecordId: row.id,
    publishNow: true,
  });

  await addTimeline(
    supabase,
    organizationId,
    row.id,
    profile.userId,
    "hr_approved",
    "HR approved resignation",
    "Clearance checklist and asset return list created.",
  );
}

export async function withdrawResignation(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  resignationId: string,
): Promise<void> {
  const { data: row, error } = await fromHrms(supabase, "exit_resignations")
    .select("*")
    .eq("id", resignationId)
    .eq("organization_id", profile.employee.organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!row) throw new Error("Resignation not found");

  if (isEmployeeOnly(profile) && row.employee_id !== profile.employee.id) {
    throw new Error("You can only withdraw your own resignation");
  }
  if (["completed", "rejected", "withdrawn"].includes(row.exit_status)) {
    throw new Error("This resignation can no longer be withdrawn");
  }

  await setResignationStatus(supabase, resignationId, profile.userId, "withdrawn", {
    withdrawn_at: new Date().toISOString(),
  });
  await addTimeline(
    supabase,
    profile.employee.organizationId,
    resignationId,
    profile.userId,
    "withdrawn",
    "Resignation withdrawn",
  );
}

export async function decideClearance(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: ClearanceDecisionValues,
): Promise<void> {
  const organizationId = profile.employee.organizationId;

  const { data: item, error } = await fromHrms(supabase, "exit_clearance_items")
    .select("*, exit_resignations:resignation_id(id, employee_id, exit_status)")
    .eq("id", input.clearanceId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!item) throw new Error("Clearance item not found");

  const { error: updateError } = await fromHrms(supabase, "exit_clearance_items")
    .update({
      clearance_status: input.clearanceStatus,
      remarks: emptyToNull(input.remarks),
      acted_by_employee_id: profile.employee.id,
      acted_by: profile.userId,
      acted_at: new Date().toISOString(),
      updated_by: profile.userId,
    })
    .eq("id", input.clearanceId);

  if (updateError) throw new Error(updateError.message);

  const resignation = Array.isArray(item.exit_resignations)
    ? item.exit_resignations[0]
    : item.exit_resignations;

  await addTimeline(
    supabase,
    organizationId,
    item.resignation_id,
    profile.userId,
    "clearance",
    `${item.department_label}: ${input.clearanceStatus}`,
    input.remarks,
  );

  const { data: pending } = await fromHrms(supabase, "exit_clearance_items")
    .select("id")
    .eq("resignation_id", item.resignation_id)
    .eq("clearance_status", "pending")
    .is("deleted_at", null)
    .limit(1);

  const { data: rejected } = await fromHrms(supabase, "exit_clearance_items")
    .select("id")
    .eq("resignation_id", item.resignation_id)
    .eq("clearance_status", "rejected")
    .is("deleted_at", null)
    .limit(1);

  if (rejected && rejected.length > 0) return;

  if (!pending || pending.length === 0) {
    const { data: assetPending } = await fromHrms(supabase, "exit_asset_returns")
      .select("id")
      .eq("resignation_id", item.resignation_id)
      .in("return_status", ["pending", "replacement_required"])
      .is("deleted_at", null)
      .limit(1);

    if (assetPending && assetPending.length > 0) {
      await setResignationStatus(supabase, item.resignation_id, profile.userId, "asset_return");
      await addTimeline(
        supabase,
        organizationId,
        item.resignation_id,
        profile.userId,
        "asset_return",
        "Clearance completed — asset returns pending",
      );
    } else {
      await ensureSettlementDraft(
        supabase,
        profile,
        item.resignation_id,
        resignation.employee_id,
      );
      await setResignationStatus(supabase, item.resignation_id, profile.userId, "settlement");
      await addTimeline(
        supabase,
        organizationId,
        item.resignation_id,
        profile.userId,
        "settlement",
        "Clearance completed — settlement ready",
      );
    }
  }
}

export async function decideAssetReturn(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: AssetReturnDecisionValues,
): Promise<void> {
  const organizationId = profile.employee.organizationId;

  const { data: item, error } = await fromHrms(supabase, "exit_asset_returns")
    .select("*, exit_resignations:resignation_id(employee_id)")
    .eq("id", input.returnId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!item) throw new Error("Asset return item not found");

  const { error: updateError } = await fromHrms(supabase, "exit_asset_returns")
    .update({
      return_status: input.returnStatus,
      condition_notes: emptyToNull(input.conditionNotes),
      recovery_amount: input.recoveryAmount ?? 0,
      returned_at: new Date().toISOString(),
      acted_by: profile.userId,
      updated_by: profile.userId,
    })
    .eq("id", input.returnId);

  if (updateError) throw new Error(updateError.message);

  if (item.assignment_id && ["returned", "damaged", "lost"].includes(input.returnStatus)) {
    const markAs =
      input.returnStatus === "lost"
        ? "lost"
        : input.returnStatus === "damaged"
          ? "damaged"
          : "returned";

    await returnAsset(supabase, profile, {
      assignmentId: item.assignment_id,
      returnedDate: new Date().toISOString().slice(0, 10),
      conditionAfter:
        input.returnStatus === "damaged"
          ? "damaged"
          : input.returnStatus === "lost"
            ? "poor"
            : "good",
      returnRemarks: emptyToNull(input.conditionNotes),
      markAs,
    });
  }

  const resignation = Array.isArray(item.exit_resignations)
    ? item.exit_resignations[0]
    : item.exit_resignations;

  await addTimeline(
    supabase,
    organizationId,
    item.resignation_id,
    profile.userId,
    "asset_return",
    `${item.asset_name}: ${input.returnStatus}`,
    input.conditionNotes,
  );

  await maybeAdvanceAfterAssets(
    supabase,
    profile,
    item.resignation_id,
    resignation.employee_id,
  );
}

export async function saveSettlement(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: SettlementFormValues,
): Promise<void> {
  const netPayable =
    input.pendingSalary +
    input.leaveEncashment +
    input.bonus +
    input.reimbursements -
    input.deductions -
    input.assetDamageRecovery;

  const { data: existing } = await fromHrms(supabase, "exit_settlements")
    .select("id")
    .eq("resignation_id", input.resignationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (existing) {
    const { error } = await fromHrms(supabase, "exit_settlements")
      .update({
        pending_salary: input.pendingSalary,
        leave_encashment: input.leaveEncashment,
        bonus: input.bonus,
        reimbursements: input.reimbursements,
        deductions: input.deductions,
        asset_damage_recovery: input.assetDamageRecovery,
        net_payable: netPayable,
        leave_balance_days: input.leaveBalanceDays,
        notes: emptyToNull(input.notes),
        settlement_status: "pending",
        updated_by: profile.userId,
      })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { data: resignation } = await fromHrms(supabase, "exit_resignations")
      .select("employee_id")
      .eq("id", input.resignationId)
      .maybeSingle();
    if (!resignation) throw new Error("Resignation not found");

    const { error } = await fromHrms(supabase, "exit_settlements").insert({
      organization_id: profile.employee.organizationId,
      resignation_id: input.resignationId,
      employee_id: resignation.employee_id,
      pending_salary: input.pendingSalary,
      leave_encashment: input.leaveEncashment,
      bonus: input.bonus,
      reimbursements: input.reimbursements,
      deductions: input.deductions,
      asset_damage_recovery: input.assetDamageRecovery,
      net_payable: netPayable,
      leave_balance_days: input.leaveBalanceDays,
      notes: emptyToNull(input.notes),
      settlement_status: "pending",
      status: "active",
      created_by: profile.userId,
      updated_by: profile.userId,
    });
    if (error) throw new Error(error.message);
  }

  await addTimeline(
    supabase,
    profile.employee.organizationId,
    input.resignationId,
    profile.userId,
    "settlement",
    "Settlement updated",
    `Net payable: ${netPayable}`,
  );
}

export async function approveSettlement(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  resignationId: string,
): Promise<void> {
  const settings = await getExitSettings(supabase, profile.employee.organizationId);

  const { data: resignation, error } = await fromHrms(supabase, "exit_resignations")
    .select("id, employee_id")
    .eq("id", resignationId)
    .eq("organization_id", profile.employee.organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!resignation) throw new Error("Resignation not found");

  const { error: updateError } = await fromHrms(supabase, "exit_settlements")
    .update({
      settlement_status: "approved",
      approved_at: new Date().toISOString(),
      approved_by: profile.userId,
      updated_by: profile.userId,
    })
    .eq("resignation_id", resignationId)
    .is("deleted_at", null);

  if (updateError) throw new Error(updateError.message);

  await addTimeline(
    supabase,
    profile.employee.organizationId,
    resignationId,
    profile.userId,
    "settlement_approved",
    "Settlement approved",
  );

  if (settings.enableExitInterview) {
    const { data: interview } = await fromHrms(supabase, "exit_interviews")
      .select("id")
      .eq("resignation_id", resignationId)
      .is("deleted_at", null)
      .maybeSingle();

    if (!interview) {
      await fromHrms(supabase, "exit_interviews").insert({
        organization_id: profile.employee.organizationId,
        resignation_id: resignationId,
        employee_id: resignation.employee_id,
        status: "active",
        created_by: profile.userId,
        updated_by: profile.userId,
      });
    }

    await setResignationStatus(supabase, resignationId, profile.userId, "interview");
  } else {
    await setResignationStatus(supabase, resignationId, profile.userId, "documents");
    await completeExitIfReady(supabase, profile, resignationId, resignation.employee_id);
  }
}

export async function saveExitInterview(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: InterviewFormValues,
): Promise<void> {
  const organizationId = profile.employee.organizationId;

  const { data: resignation } = await fromHrms(supabase, "exit_resignations")
    .select("id, employee_id, exit_status")
    .eq("id", input.resignationId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!resignation) throw new Error("Resignation not found");

  const payload = {
    reason_for_leaving: emptyToNull(input.reasonForLeaving),
    manager_rating: input.managerRating ?? null,
    work_environment_rating: input.workEnvironmentRating ?? null,
    salary_satisfaction_rating: input.salarySatisfactionRating ?? null,
    growth_opportunities_rating: input.growthOpportunitiesRating ?? null,
    company_culture_rating: input.companyCultureRating ?? null,
    suggestions: emptyToNull(input.suggestions),
    overall_rating: input.overallRating ?? null,
    hr_private_notes: isHrAdmin(profile) ? emptyToNull(input.hrPrivateNotes) : undefined,
    conducted_at: new Date().toISOString(),
    conducted_by: profile.userId,
    updated_by: profile.userId,
  };

  const { data: existing } = await fromHrms(supabase, "exit_interviews")
    .select("id")
    .eq("resignation_id", input.resignationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (existing) {
    const { error } = await fromHrms(supabase, "exit_interviews")
      .update(payload)
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await fromHrms(supabase, "exit_interviews").insert({
      organization_id: organizationId,
      resignation_id: input.resignationId,
      employee_id: resignation.employee_id,
      ...payload,
      status: "active",
      created_by: profile.userId,
    });
    if (error) throw new Error(error.message);
  }

  await addTimeline(
    supabase,
    organizationId,
    input.resignationId,
    profile.userId,
    "interview",
    "Exit interview completed",
  );

  await setResignationStatus(supabase, input.resignationId, profile.userId, "documents");
  await completeExitIfReady(supabase, profile, input.resignationId, resignation.employee_id);
}

export async function generateExitDocuments(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  resignationId: string,
): Promise<void> {
  const { data: resignation } = await fromHrms(supabase, "exit_resignations")
    .select("id, employee_id")
    .eq("id", resignationId)
    .eq("organization_id", profile.employee.organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!resignation) throw new Error("Resignation not found");

  await autoGenerateLetterForEmployee(supabase, profile, {
    employeeId: resignation.employee_id,
    letterType: "relieving_letter",
    sourceModule: "exit",
    sourceRecordId: resignationId,
    publishNow: true,
  });
  await autoGenerateLetterForEmployee(supabase, profile, {
    employeeId: resignation.employee_id,
    letterType: "experience_letter",
    sourceModule: "exit",
    sourceRecordId: resignationId,
    publishNow: true,
  });
  await autoGenerateLetterForEmployee(supabase, profile, {
    employeeId: resignation.employee_id,
    letterType: "settlement_letter",
    sourceModule: "exit",
    sourceRecordId: resignationId,
    publishNow: true,
  });
  await autoGenerateLetterForEmployee(supabase, profile, {
    employeeId: resignation.employee_id,
    letterType: "resignation_acceptance_letter",
    sourceModule: "exit",
    sourceRecordId: resignationId,
    publishNow: true,
  });

  await addTimeline(
    supabase,
    profile.employee.organizationId,
    resignationId,
    profile.userId,
    "documents",
    "Exit documents regenerated",
  );
}
