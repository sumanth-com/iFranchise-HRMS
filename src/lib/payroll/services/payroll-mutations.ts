import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { UserProfile } from "@/types/auth";
import type {
  PayrollBreakdown,
  PayrollDetail,
  PayrollPreviewResult,
  PayslipDetail,
} from "@/types/payroll";
import {
  calculateEmployeePayroll,
  type AttendanceSummary,
} from "@/lib/payroll/services/payroll-calculator";
import {
  generatePayslipNumber,
  getMonthDateRange,
  getPayrollMonthDate,
  maskAccountNumber,
  roundCurrency,
} from "@/lib/payroll/services/payroll-utils";
import { PAYROLL_ROUTES } from "@/lib/payroll/constants";
import type { PayrollRunInput } from "@/lib/validations/payroll";
import {
  salaryRevisionFormSchema,
  salaryStructureFormSchema,
} from "@/lib/validations/payroll";

function unwrapRelation<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

async function getActiveEmployees(
  supabase: AuthSupabaseClient,
  organizationId: string,
) {
  const { data, error } = await supabase
    .schema("hrms")
    .from("employees")
    .select(
      `
        id,
        employee_code,
        first_name,
        last_name,
        departments:department_id (name)
      `,
    )
    .eq("organization_id", organizationId)
    .eq("employment_status", "active")
    .is("deleted_at", null)
    .order("employee_code", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

async function getEffectiveSalaryStructure(
  supabase: AuthSupabaseClient,
  employeeId: string,
  month: number,
  year: number,
) {
  const { endDate } = getMonthDateRange(month, year);
  const { data, error } = await supabase
    .schema("hrms")
    .from("salary_structures")
    .select("*")
    .eq("employee_id", employeeId)
    .lte("effective_from", endDate)
    .is("deleted_at", null)
    .or(`effective_to.is.null,effective_to.gte.${getPayrollMonthDate(month, year)}`)
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

async function getAttendanceSummary(
  supabase: AuthSupabaseClient,
  employeeId: string,
  month: number,
  year: number,
): Promise<AttendanceSummary> {
  const range = getMonthDateRange(month, year);
  const { data, error } = await supabase
    .schema("hrms")
    .from("attendance")
    .select("attendance_status, overtime_hours")
    .eq("employee_id", employeeId)
    .gte("attendance_date", range.startDate)
    .lte("attendance_date", range.endDate)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);

  const summary: AttendanceSummary = {
    presentDays: 0,
    absentDays: 0,
    halfDays: 0,
    onLeaveDays: 0,
    weekOffDays: 0,
    holidayDays: 0,
    overtimeHours: 0,
  };

  for (const row of data ?? []) {
    switch (row.attendance_status) {
      case "present":
      case "late":
        summary.presentDays += 1;
        break;
      case "absent":
        summary.absentDays += 1;
        break;
      case "half_day":
        summary.halfDays += 1;
        break;
      case "on_leave":
        summary.onLeaveDays += 1;
        break;
      case "week_off":
        summary.weekOffDays += 1;
        break;
      case "holiday":
        summary.holidayDays += 1;
        break;
      default:
        break;
    }
    summary.overtimeHours += Number(row.overtime_hours ?? 0);
  }

  return summary;
}

async function getLeaveLopDays(
  supabase: AuthSupabaseClient,
  employeeId: string,
  month: number,
  year: number,
): Promise<number> {
  const range = getMonthDateRange(month, year);

  const { data: lopType } = await supabase
    .schema("hrms")
    .from("leave_types")
    .select("id")
    .eq("code", "LOP")
    .is("deleted_at", null)
    .maybeSingle();

  if (!lopType) return 0;

  const { data, error } = await supabase
    .schema("hrms")
    .from("leave_requests")
    .select("total_days")
    .eq("employee_id", employeeId)
    .eq("leave_type_id", lopType.id)
    .eq("leave_status", "approved")
    .lte("start_date", range.endDate)
    .gte("end_date", range.startDate)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);

  return (data ?? []).reduce((sum, row) => sum + Number(row.total_days), 0);
}

async function getApprovedBonuses(
  supabase: AuthSupabaseClient,
  employeeId: string,
  month: number,
  year: number,
) {
  const { data, error } = await supabase
    .schema("hrms")
    .from("employee_bonuses")
    .select("amount, bonus_type")
    .eq("employee_id", employeeId)
    .eq("bonus_month", getPayrollMonthDate(month, year))
    .eq("bonus_status", "approved")
    .is("payroll_id", null)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);
  return data ?? [];
}

async function getApprovedReimbursements(
  supabase: AuthSupabaseClient,
  employeeId: string,
  month: number,
  year: number,
) {
  const range = getMonthDateRange(month, year);
  const { data, error } = await supabase
    .schema("hrms")
    .from("employee_reimbursements")
    .select("amount, category")
    .eq("employee_id", employeeId)
    .eq("reimbursement_status", "approved")
    .is("payroll_id", null)
    .gte("expense_date", range.startDate)
    .lte("expense_date", range.endDate)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function buildPayrollPreview(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: PayrollRunInput,
): Promise<PayrollPreviewResult> {
  const { month, year } = input;
  const organizationId = profile.employee.organizationId;
  const employees = await getActiveEmployees(supabase, organizationId);

  const items = await Promise.all(
    employees.map(async (employee) => {
      const department = unwrapRelation(
        employee.departments as { name: string } | { name: string }[] | null,
      );
      const [salaryStructure, attendance, leaveLopDays, bonuses, reimbursements] =
        await Promise.all([
          getEffectiveSalaryStructure(supabase, employee.id, month, year),
          getAttendanceSummary(supabase, employee.id, month, year),
          getLeaveLopDays(supabase, employee.id, month, year),
          getApprovedBonuses(supabase, employee.id, month, year),
          getApprovedReimbursements(supabase, employee.id, month, year),
        ]);

      const calc = calculateEmployeePayroll({
        month,
        year,
        salaryStructure,
        attendance,
        leaveLopDays,
        bonuses,
        reimbursements,
      });

      return {
        employeeId: employee.id,
        employeeCode: employee.employee_code,
        employeeName: `${employee.first_name} ${employee.last_name}`,
        departmentName: department?.name ?? null,
        hasSalaryStructure: Boolean(salaryStructure),
        basicSalary: calc.basicSalary,
        totalAllowances: calc.totalAllowances,
        totalDeductions: calc.totalDeductions,
        grossSalary: calc.grossSalary,
        netSalary: calc.netSalary,
        breakdown: calc.breakdown,
      };
    }),
  );

  const totalGross = roundCurrency(items.reduce((s, i) => s + i.grossSalary, 0));
  const totalDeductions = roundCurrency(
    items.reduce((s, i) => s + i.totalDeductions, 0),
  );
  const totalNet = roundCurrency(items.reduce((s, i) => s + i.netSalary, 0));

  return {
    month,
    year,
    payrollMonth: getPayrollMonthDate(month, year),
    items,
    totalGross,
    totalDeductions,
    totalNet,
    employeeCount: items.length,
  };
}

export async function previewPayrollRun(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: PayrollRunInput,
): Promise<PayrollPreviewResult> {
  return buildPayrollPreview(supabase, profile, input);
}

export async function generatePayrollRun(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: PayrollRunInput,
): Promise<string> {
  const preview = await buildPayrollPreview(supabase, profile, input);
  const organizationId = profile.employee.organizationId;
  const payrollMonth = preview.payrollMonth;

  const { data: existing } = await supabase
    .schema("hrms")
    .from("payrolls")
    .select("id, payroll_status, is_locked")
    .eq("organization_id", organizationId)
    .eq("payroll_month", payrollMonth)
    .is("deleted_at", null)
    .maybeSingle();

  if (existing?.is_locked) {
    throw new Error("Payroll for this month is locked and cannot be regenerated.");
  }

  let payrollId = existing?.id;

  if (!payrollId) {
    const { data: created, error: createError } = await supabase
      .schema("hrms")
      .from("payrolls")
      .insert({
        organization_id: organizationId,
        payroll_month: payrollMonth,
        payroll_status: "draft",
        total_gross: preview.totalGross,
        total_deductions: preview.totalDeductions,
        total_net: preview.totalNet,
        notes: input.notes ?? null,
        created_by: profile.userId,
        updated_by: profile.userId,
      })
      .select("id")
      .single();

    if (createError) throw new Error(createError.message);
    payrollId = created.id;
  } else {
    const { error: updateError } = await supabase
      .schema("hrms")
      .from("payrolls")
      .update({
        total_gross: preview.totalGross,
        total_deductions: preview.totalDeductions,
        total_net: preview.totalNet,
        notes: input.notes ?? null,
        payroll_status: "draft",
        updated_by: profile.userId,
      })
      .eq("id", payrollId);

    if (updateError) throw new Error(updateError.message);

    await supabase
      .schema("hrms")
      .from("payroll_items")
      .delete()
      .eq("payroll_id", payrollId);
  }

  const employees = await getActiveEmployees(supabase, organizationId);

  for (const item of preview.items) {
    const salaryStructure = await getEffectiveSalaryStructure(
      supabase,
      item.employeeId,
      input.month,
      input.year,
    );

    const { error: itemError } = await supabase.schema("hrms").from("payroll_items").insert({
      payroll_id: payrollId,
      employee_id: item.employeeId,
      salary_structure_id: salaryStructure?.id ?? null,
      basic_salary: item.basicSalary,
      total_allowances: item.totalAllowances,
      total_deductions: item.totalDeductions,
      gross_salary: item.grossSalary,
      net_salary: item.netSalary,
      breakdown: item.breakdown,
      created_by: profile.userId,
      updated_by: profile.userId,
    });

    if (itemError) throw new Error(itemError.message);
  }

  const month = input.month;
  const year = input.year;

  for (const employee of employees) {
    await supabase
      .schema("hrms")
      .from("employee_bonuses")
      .update({ payroll_id: payrollId, updated_by: profile.userId })
      .eq("employee_id", employee.id)
      .eq("bonus_month", payrollMonth)
      .eq("bonus_status", "approved")
      .is("payroll_id", null);

    const range = getMonthDateRange(month, year);
    await supabase
      .schema("hrms")
      .from("employee_reimbursements")
      .update({ payroll_id: payrollId, updated_by: profile.userId })
      .eq("employee_id", employee.id)
      .eq("reimbursement_status", "approved")
      .is("payroll_id", null)
      .gte("expense_date", range.startDate)
      .lte("expense_date", range.endDate);
  }

  return payrollId;
}

export async function processPayrollRun(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  payrollId: string,
): Promise<void> {
  const { data: payroll, error } = await supabase
    .schema("hrms")
    .from("payrolls")
    .select("id, payroll_status, is_locked, organization_id")
    .eq("id", payrollId)
    .is("deleted_at", null)
    .single();

  if (error || !payroll) throw new Error("Payroll run not found.");
  if (payroll.is_locked) throw new Error("Payroll is locked.");
  if (payroll.organization_id !== profile.employee.organizationId) {
    throw new Error("Unauthorized payroll access.");
  }

  const { error: updateError } = await supabase
    .schema("hrms")
    .from("payrolls")
    .update({
      payroll_status: "processed",
      processed_at: new Date().toISOString(),
      processed_by: profile.userId,
      updated_by: profile.userId,
    })
    .eq("id", payrollId);

  if (updateError) throw new Error(updateError.message);

  await initializePayrollApprovals(supabase, profile, payrollId);
}

async function initializePayrollApprovals(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  payrollId: string,
) {
  const organizationId = profile.employee.organizationId;

  const { data: hrApprovers } = await supabase
    .schema("hrms")
    .from("user_roles")
    .select("employee_id, roles!inner (code)")
    .eq("organization_id", organizationId)
    .in("roles.code", ["hr_admin", "super_admin"]);

  const approverIds = [
    ...new Set(
      (hrApprovers ?? [])
        .map((row) => row.employee_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const levels = [1, 2, 3];
  for (const level of levels) {
    const approverEmployeeId =
      approverIds[level - 1] ?? profile.employee.id;

    const { error } = await supabase.schema("hrms").from("payroll_approvals").upsert(
      {
        payroll_id: payrollId,
        approver_employee_id: approverEmployeeId,
        approval_level: level,
        approval_status: level === 1 ? "pending" : "pending",
        created_by: profile.userId,
        updated_by: profile.userId,
      },
      { onConflict: "payroll_id,approval_level" },
    );

    if (error) throw new Error(error.message);
  }
}

export async function approvePayrollStep(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  payrollId: string,
  comments?: string,
): Promise<void> {
  const { data: payroll, error } = await supabase
    .schema("hrms")
    .from("payrolls")
    .select("id, payroll_status, is_locked, organization_id")
    .eq("id", payrollId)
    .is("deleted_at", null)
    .single();

  if (error || !payroll) throw new Error("Payroll run not found.");
  if (payroll.is_locked) throw new Error("Payroll is already locked.");

  const { data: approvals, error: approvalsError } = await supabase
    .schema("hrms")
    .from("payroll_approvals")
    .select("id, approval_level, approval_status")
    .eq("payroll_id", payrollId)
    .is("deleted_at", null)
    .order("approval_level", { ascending: true });

  if (approvalsError) throw new Error(approvalsError.message);

  const pending = (approvals ?? []).find((a) => a.approval_status === "pending");
  if (!pending) throw new Error("No pending approval step.");

  const { error: approveError } = await supabase
    .schema("hrms")
    .from("payroll_approvals")
    .update({
      approval_status: "approved",
      comments: comments ?? null,
      acted_at: new Date().toISOString(),
      approver_employee_id: profile.employee.id,
      updated_by: profile.userId,
    })
    .eq("id", pending.id);

  if (approveError) throw new Error(approveError.message);

  const remaining = (approvals ?? []).filter(
    (a) => a.id !== pending.id && a.approval_status === "pending",
  );

  if (remaining.length === 0) {
    await supabase
      .schema("hrms")
      .from("payrolls")
      .update({
        payroll_status: "approved",
        approved_at: new Date().toISOString(),
        approved_by: profile.userId,
        is_locked: true,
        updated_by: profile.userId,
      })
      .eq("id", payrollId);

    await generatePayslips(supabase, profile, payrollId);
  }
}

export async function rejectPayrollRun(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  payrollId: string,
  comments: string,
): Promise<void> {
  const { data: pending } = await supabase
    .schema("hrms")
    .from("payroll_approvals")
    .select("id")
    .eq("payroll_id", payrollId)
    .eq("approval_status", "pending")
    .order("approval_level", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (pending) {
    await supabase
      .schema("hrms")
      .from("payroll_approvals")
      .update({
        approval_status: "rejected",
        comments,
        acted_at: new Date().toISOString(),
        approver_employee_id: profile.employee.id,
        updated_by: profile.userId,
      })
      .eq("id", pending.id);
  }

  const { error } = await supabase
    .schema("hrms")
    .from("payrolls")
    .update({
      payroll_status: "cancelled",
      updated_by: profile.userId,
    })
    .eq("id", payrollId);

  if (error) throw new Error(error.message);
}

export async function markPayrollPaid(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  payrollId: string,
): Promise<void> {
  const { error } = await supabase
    .schema("hrms")
    .from("payrolls")
    .update({
      payroll_status: "paid",
      updated_by: profile.userId,
    })
    .eq("id", payrollId)
    .eq("payroll_status", "approved");

  if (error) throw new Error(error.message);

  await supabase
    .schema("hrms")
    .from("employee_bonuses")
    .update({ bonus_status: "paid", updated_by: profile.userId })
    .eq("payroll_id", payrollId);

  await supabase
    .schema("hrms")
    .from("employee_reimbursements")
    .update({ reimbursement_status: "paid", updated_by: profile.userId })
    .eq("payroll_id", payrollId);
}

export async function generatePayslips(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  payrollId: string,
): Promise<void> {
  const { data: payroll } = await supabase
    .schema("hrms")
    .from("payrolls")
    .select("payroll_month")
    .eq("id", payrollId)
    .single();

  if (!payroll) throw new Error("Payroll not found.");

  const { data: items, error } = await supabase
    .schema("hrms")
    .from("payroll_items")
    .select(
      `
        id,
        employee_id,
        employees (employee_code)
      `,
    )
    .eq("payroll_id", payrollId)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);

  for (const item of items ?? []) {
    const employee = unwrapRelation(
      item.employees as { employee_code: string } | { employee_code: string }[] | null,
    );
    if (!employee) continue;

    const payslipNumber = generatePayslipNumber(
      employee.employee_code,
      payroll.payroll_month,
    );

    const { data: existing } = await supabase
      .schema("hrms")
      .from("payslips")
      .select("id")
      .eq("payroll_item_id", item.id)
      .maybeSingle();

    if (existing) continue;

    const { error: insertError } = await supabase.schema("hrms").from("payslips").insert({
      payroll_id: payrollId,
      payroll_item_id: item.id,
      employee_id: item.employee_id,
      payslip_number: payslipNumber,
      created_by: profile.userId,
      updated_by: profile.userId,
    });

    if (insertError) throw new Error(insertError.message);
  }
}

export async function emailPayslip(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  payslipId: string,
): Promise<void> {
  const { data: payslip, error } = await supabase
    .schema("hrms")
    .from("payslips")
    .select(
      `
        id,
        payslip_number,
        employee_id,
        payrolls:payroll_id (payroll_month),
        employees:employee_id (first_name, last_name, user_id)
      `,
    )
    .eq("id", payslipId)
    .single();

  if (error || !payslip) throw new Error("Payslip not found.");

  const employee = unwrapRelation(
    payslip.employees as
      | { first_name: string; last_name: string; user_id: string | null }
      | Array<{ first_name: string; last_name: string; user_id: string | null }>
      | null,
  );
  const payroll = unwrapRelation(
    payslip.payrolls as { payroll_month: string } | { payroll_month: string }[] | null,
  );

  const { data: userRole } = await supabase
    .schema("hrms")
    .from("user_roles")
    .select("user_id")
    .eq("employee_id", payslip.employee_id)
    .limit(1)
    .maybeSingle();

  const userId = userRole?.user_id ?? employee?.user_id;
  if (!userId) {
    throw new Error("Employee does not have a linked user account for email notification.");
  }

  const monthLabel = payroll?.payroll_month
    ? new Date(payroll.payroll_month).toLocaleString("en-IN", {
        month: "long",
        year: "numeric",
      })
    : "";

  const { error: notifyError } = await supabase.schema("hrms").from("notifications").insert({
    organization_id: profile.employee.organizationId,
    user_id: userId,
    employee_id: payslip.employee_id,
    title: "Payslip available",
    message: `Your payslip for ${monthLabel} (${payslip.payslip_number}) is ready to view.`,
    notification_type: "payslip",
    notification_status: "unread",
    action_url: PAYROLL_ROUTES.payslipDetail(payslipId),
    status: "active",
    created_by: profile.userId,
  });

  if (notifyError) throw new Error(notifyError.message);
}

export async function createSalaryStructure(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: unknown,
): Promise<string> {
  const parsed = salaryStructureFormSchema.parse(input);

  const { data: previous } = await supabase
    .schema("hrms")
    .from("salary_structures")
    .select("id, effective_from")
    .eq("employee_id", parsed.employeeId)
    .is("deleted_at", null)
    .is("effective_to", null)
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (previous) {
    const dayBefore = new Date(parsed.effectiveFrom);
    dayBefore.setDate(dayBefore.getDate() - 1);
    const effectiveTo = dayBefore.toISOString().slice(0, 10);

    await supabase
      .schema("hrms")
      .from("salary_structures")
      .update({
        effective_to: effectiveTo,
        updated_by: profile.userId,
      })
      .eq("id", previous.id);
  }

  const { data, error } = await supabase
    .schema("hrms")
    .from("salary_structures")
    .insert({
      employee_id: parsed.employeeId,
      effective_from: parsed.effectiveFrom,
      effective_to: parsed.effectiveTo ?? null,
      currency_code: parsed.currencyCode,
      basic_salary: parsed.basicSalary,
      hra_amount: parsed.hraAmount,
      transport_allowance: parsed.transportAllowance,
      other_allowances: parsed.otherAllowances,
      tax_deduction: parsed.taxDeduction,
      other_deductions: parsed.otherDeductions,
      gross_salary: parsed.grossSalary,
      net_salary: parsed.netSalary,
      components: parsed.components,
      created_by: profile.userId,
      updated_by: profile.userId,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}

export async function createBonus(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: {
    employeeId: string;
    bonusType: string;
    amount: number;
    bonusMonth: string;
    reason?: string;
  },
): Promise<string> {
  const bonusMonth = input.bonusMonth.slice(0, 7) + "-01";

  const { data, error } = await supabase
    .schema("hrms")
    .from("employee_bonuses")
    .insert({
      organization_id: profile.employee.organizationId,
      employee_id: input.employeeId,
      bonus_type: input.bonusType,
      amount: input.amount,
      bonus_month: bonusMonth,
      reason: input.reason ?? null,
      created_by: profile.userId,
      updated_by: profile.userId,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}

export async function approveBonus(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  bonusId: string,
): Promise<void> {
  const { error } = await supabase
    .schema("hrms")
    .from("employee_bonuses")
    .update({
      bonus_status: "approved",
      approved_by: profile.userId,
      approved_at: new Date().toISOString(),
      updated_by: profile.userId,
    })
    .eq("id", bonusId)
    .eq("organization_id", profile.employee.organizationId);

  if (error) throw new Error(error.message);
}

export async function createReimbursement(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: {
    employeeId: string;
    category: string;
    amount: number;
    expenseDate: string;
    description?: string;
  },
): Promise<string> {
  const { data, error } = await supabase
    .schema("hrms")
    .from("employee_reimbursements")
    .insert({
      organization_id: profile.employee.organizationId,
      employee_id: input.employeeId,
      category: input.category,
      amount: input.amount,
      expense_date: input.expenseDate,
      description: input.description ?? null,
      created_by: profile.userId,
      updated_by: profile.userId,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}

export async function approveReimbursement(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  reimbursementId: string,
): Promise<void> {
  const { error } = await supabase
    .schema("hrms")
    .from("employee_reimbursements")
    .update({
      reimbursement_status: "approved",
      approver_employee_id: profile.employee.id,
      approved_at: new Date().toISOString(),
      updated_by: profile.userId,
    })
    .eq("id", reimbursementId)
    .eq("organization_id", profile.employee.organizationId);

  if (error) throw new Error(error.message);
}

export async function createSalaryRevision(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: unknown,
): Promise<string> {
  const parsed = salaryRevisionFormSchema.parse(input);

  const { data: currentStructure } = await supabase
    .schema("hrms")
    .from("salary_structures")
    .select("id, gross_salary, net_salary")
    .eq("employee_id", parsed.employeeId)
    .is("deleted_at", null)
    .is("effective_to", null)
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();

  const newStructureId = await createSalaryStructure(supabase, profile, input);

  const { data, error } = await supabase
    .schema("hrms")
    .from("salary_revisions")
    .insert({
      organization_id: profile.employee.organizationId,
      employee_id: parsed.employeeId,
      previous_structure_id: currentStructure?.id ?? null,
      new_structure_id: newStructureId,
      old_gross_salary: currentStructure ? Number(currentStructure.gross_salary) : 0,
      new_gross_salary: parsed.grossSalary,
      old_net_salary: currentStructure ? Number(currentStructure.net_salary) : 0,
      new_net_salary: parsed.netSalary,
      effective_from: parsed.effectiveFrom,
      revision_status: "applied",
      reason: parsed.reason,
      approver_employee_id: profile.employee.id,
      approved_at: new Date().toISOString(),
      created_by: profile.userId,
      updated_by: profile.userId,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}

export async function getPayrollRunById(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  payrollId: string,
): Promise<PayrollDetail | null> {
  const organizationId = profile.employee.organizationId;

  const { data: payroll, error } = await supabase
    .schema("hrms")
    .from("payrolls")
    .select("*")
    .eq("id", payrollId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!payroll) return null;

  const { data: items, error: itemsError } = await supabase
    .schema("hrms")
    .from("payroll_items")
    .select(
      `
        id,
        employee_id,
        basic_salary,
        total_allowances,
        total_deductions,
        gross_salary,
        net_salary,
        breakdown,
        employees (
          employee_code,
          first_name,
          last_name,
          departments:department_id (name)
        )
      `,
    )
    .eq("payroll_id", payrollId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (itemsError) throw new Error(itemsError.message);

  const { data: approvals, error: approvalsError } = await supabase
    .schema("hrms")
    .from("payroll_approvals")
    .select(
      `
        id,
        approval_level,
        approval_status,
        approver_employee_id,
        comments,
        acted_at,
        employees:approver_employee_id (first_name, last_name)
      `,
    )
    .eq("payroll_id", payrollId)
    .is("deleted_at", null)
    .order("approval_level", { ascending: true });

  if (approvalsError) throw new Error(approvalsError.message);

  return {
    id: payroll.id,
    payrollMonth: payroll.payroll_month,
    payrollStatus: payroll.payroll_status,
    totalGross: Number(payroll.total_gross),
    totalDeductions: Number(payroll.total_deductions),
    totalNet: Number(payroll.total_net),
    isLocked: Boolean(payroll.is_locked),
    notes: payroll.notes,
    processedAt: payroll.processed_at,
    approvedAt: payroll.approved_at,
    items: (items ?? []).map((row) => {
      const employee = unwrapRelation(row.employees);
      const department = employee
        ? unwrapRelation(
            employee.departments as { name: string } | { name: string }[] | null,
          )
        : null;
      return {
        id: row.id,
        employeeId: row.employee_id,
        employeeCode: employee?.employee_code ?? "",
        employeeName: employee
          ? `${employee.first_name} ${employee.last_name}`
          : "",
        departmentName: department?.name ?? null,
        basicSalary: Number(row.basic_salary),
        totalAllowances: Number(row.total_allowances),
        totalDeductions: Number(row.total_deductions),
        grossSalary: Number(row.gross_salary),
        netSalary: Number(row.net_salary),
        breakdown: (row.breakdown as PayrollBreakdown) ?? {
          earnings: [],
          deductions: [],
          attendance: {
            workingDays: 0,
            presentDays: 0,
            absentDays: 0,
            lopDays: 0,
            leaveLopDays: 0,
            overtimeHours: 0,
          },
        },
      };
    }),
    approvals: (approvals ?? []).map((row) => {
      const approver = unwrapRelation(
        row.employees as
          | { first_name: string; last_name: string }
          | { first_name: string; last_name: string }[]
          | null,
      );
      return {
        id: row.id,
        approvalLevel: row.approval_level,
        approvalStatus: row.approval_status,
        approverEmployeeId: row.approver_employee_id,
        approverName: approver
          ? `${approver.first_name} ${approver.last_name}`
          : "",
        comments: row.comments,
        actedAt: row.acted_at,
      };
    }),
  };
}

export async function getPayslipById(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  payslipId: string,
): Promise<PayslipDetail | null> {
  const organizationId = profile.employee.organizationId;

  const { data: payslip, error } = await supabase
    .schema("hrms")
    .from("payslips")
    .select(
      `
        id,
        payslip_number,
        issued_at,
        employee_id,
        payroll_items:payroll_item_id (
          basic_salary,
          total_allowances,
          total_deductions,
          gross_salary,
          net_salary,
          breakdown
        ),
        payrolls:payroll_id (
          payroll_month,
          payroll_status,
          organization_id,
          organizations:organization_id (name)
        ),
        employees:employee_id (
          employee_code,
          first_name,
          last_name,
          email,
          date_of_joining,
          organization_id,
          departments:department_id (name),
          designations:designation_id (title)
        )
      `,
    )
    .eq("id", payslipId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!payslip) return null;

  const employee = unwrapRelation(payslip.employees);
  const payroll = unwrapRelation(payslip.payrolls);
  const payrollItem = unwrapRelation(payslip.payroll_items);

  if (!employee || !payroll || employee.organization_id !== organizationId) {
    return null;
  }

  const organization = unwrapRelation(
    payroll.organizations as { name: string } | { name: string }[] | null,
  );
  const department = unwrapRelation(
    employee.departments as { name: string } | { name: string }[] | null,
  );
  const designation = unwrapRelation(
    employee.designations as { title: string } | { title: string }[] | null,
  );

  const { data: bankAccount } = await supabase
    .schema("hrms")
    .from("employee_bank_accounts")
    .select("bank_name, account_number")
    .eq("employee_id", payslip.employee_id)
    .eq("is_primary", true)
    .is("deleted_at", null)
    .maybeSingle();

  return {
    id: payslip.id,
    payslipNumber: payslip.payslip_number,
    issuedAt: payslip.issued_at,
    payrollMonth: payroll.payroll_month,
    payrollStatus: payroll.payroll_status,
    employee: {
      id: payslip.employee_id,
      employeeCode: employee.employee_code,
      firstName: employee.first_name,
      lastName: employee.last_name,
      email: employee.email,
      departmentName: department?.name ?? null,
      designationTitle: designation?.title ?? null,
      dateOfJoining: employee.date_of_joining,
    },
    organization: {
      name: organization?.name ?? "Organization",
    },
    basicSalary: Number(payrollItem?.basic_salary ?? 0),
    totalAllowances: Number(payrollItem?.total_allowances ?? 0),
    totalDeductions: Number(payrollItem?.total_deductions ?? 0),
    grossSalary: Number(payrollItem?.gross_salary ?? 0),
    netSalary: Number(payrollItem?.net_salary ?? 0),
    breakdown: (payrollItem?.breakdown as PayrollBreakdown) ?? {
      earnings: [],
      deductions: [],
      attendance: {
        workingDays: 0,
        presentDays: 0,
        absentDays: 0,
        lopDays: 0,
        leaveLopDays: 0,
        overtimeHours: 0,
      },
    },
    bankAccount: bankAccount
      ? {
          bankName: bankAccount.bank_name,
          accountNumberMasked: maskAccountNumber(bankAccount.account_number),
        }
      : null,
  };
}
