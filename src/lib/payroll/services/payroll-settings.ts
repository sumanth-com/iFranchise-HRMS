import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { UserProfile } from "@/types/auth";
import type {
  PayrollSettingsData,
  PayrollSettingsRecord,
} from "@/types/payroll-settings";
import { payrollSettingsSchema } from "@/lib/validations/payroll-settings";

export const DEFAULT_PAYROLL_SETTINGS: PayrollSettingsData = {
  payrollCycle: "monthly",
  payrollProcessingDay: "last_working_day",
  salaryCreditDate: 1,
  financialYearStartMonth: 4,
  financialYearEndMonth: 3,
  currency: "INR",
  workingDaysCalculation: "calendar_days",
  attendanceRules: {
    minimumWorkingHours: 8,
    halfDayThreshold: 4,
    lateMarkThreshold: "10:15",
    overtimeCalculation: true,
    autoCalculateAttendance: true,
    ignoreWeekends: true,
    ignoreCompanyHolidays: true,
  },
  leaveIntegration: {
    paidLeaveDeduction: false,
    lossOfPayDeduction: true,
    halfDayDeduction: true,
    sandwichLeavePolicy: false,
    includeHolidaysInLeave: false,
  },
  salaryComponents: {
    basic: true,
    hra: true,
    specialAllowance: true,
    medical: true,
    travel: true,
    pf: true,
    esi: true,
    professionalTax: true,
    incomeTax: true,
    bonus: true,
    reimbursement: true,
    otherDeduction: true,
  },
  approvalWorkflow: ["hr", "finance", "super_admin"],
  payslip: {
    companyLogoPath: null,
    companyName: "iFranchise",
    footerMessage: "This is a system-generated payslip.",
    authorizedSignature: null,
    autoEmailPayslips: true,
    generatePdfAutomatically: true,
  },
  notifications: {
    notifyEmployee: true,
    notifyFinance: true,
    notifyHr: true,
    emailPayslip: true,
    reminderBeforePayrollRun: true,
  },
  payrollLock: {
    lockAfterApproval: true,
    allowReopening: false,
    requireApprovalBeforeUnlock: true,
  },
};

function snakeToCamel(key: string): string {
  return key.replace(/_([a-z])/g, (_, char: string) => char.toUpperCase());
}

function mapObjectKeys<T extends Record<string, unknown>>(
  value: Record<string, unknown>,
): T {
  return Object.fromEntries(
    Object.entries(value).map(([key, val]) => [snakeToCamel(key), val]),
  ) as T;
}

function parseStoredPayrollSettings(raw: unknown): PayrollSettingsData {
  if (!raw || typeof raw !== "object") {
    return DEFAULT_PAYROLL_SETTINGS;
  }

  const stored = raw as Record<string, unknown>;

  return payrollSettingsSchema.parse({
    ...DEFAULT_PAYROLL_SETTINGS,
    payrollCycle: stored.payroll_cycle ?? stored.payrollCycle ?? DEFAULT_PAYROLL_SETTINGS.payrollCycle,
    payrollProcessingDay:
      stored.payroll_processing_day ??
      stored.payrollProcessingDay ??
      DEFAULT_PAYROLL_SETTINGS.payrollProcessingDay,
    salaryCreditDate:
      stored.salary_credit_date ??
      stored.salaryCreditDate ??
      DEFAULT_PAYROLL_SETTINGS.salaryCreditDate,
    financialYearStartMonth:
      stored.financial_year_start_month ??
      stored.financialYearStartMonth ??
      DEFAULT_PAYROLL_SETTINGS.financialYearStartMonth,
    financialYearEndMonth:
      stored.financial_year_end_month ??
      stored.financialYearEndMonth ??
      DEFAULT_PAYROLL_SETTINGS.financialYearEndMonth,
    currency: stored.currency ?? DEFAULT_PAYROLL_SETTINGS.currency,
    workingDaysCalculation:
      stored.working_days_calculation ??
      stored.workingDaysCalculation ??
      DEFAULT_PAYROLL_SETTINGS.workingDaysCalculation,
    attendanceRules: {
      ...DEFAULT_PAYROLL_SETTINGS.attendanceRules,
      ...(stored.attendance_rules
        ? mapObjectKeys(stored.attendance_rules as Record<string, unknown>)
        : stored.attendanceRules
          ? mapObjectKeys(stored.attendanceRules as Record<string, unknown>)
          : {}),
    },
    leaveIntegration: {
      ...DEFAULT_PAYROLL_SETTINGS.leaveIntegration,
      ...(stored.leave_integration
        ? mapObjectKeys(stored.leave_integration as Record<string, unknown>)
        : stored.leaveIntegration
          ? mapObjectKeys(stored.leaveIntegration as Record<string, unknown>)
          : {}),
    },
    salaryComponents: {
      ...DEFAULT_PAYROLL_SETTINGS.salaryComponents,
      ...(stored.salary_components
        ? mapObjectKeys(stored.salary_components as Record<string, unknown>)
        : stored.salaryComponents
          ? mapObjectKeys(stored.salaryComponents as Record<string, unknown>)
          : {}),
    },
    approvalWorkflow:
      (stored.approval_workflow as PayrollSettingsData["approvalWorkflow"]) ??
      (stored.approvalWorkflow as PayrollSettingsData["approvalWorkflow"]) ??
      DEFAULT_PAYROLL_SETTINGS.approvalWorkflow,
    payslip: {
      ...DEFAULT_PAYROLL_SETTINGS.payslip,
      ...(stored.payslip
        ? mapObjectKeys(stored.payslip as Record<string, unknown>)
        : {}),
    },
    notifications: {
      ...DEFAULT_PAYROLL_SETTINGS.notifications,
      ...(stored.notifications
        ? mapObjectKeys(stored.notifications as Record<string, unknown>)
        : {}),
    },
    payrollLock: {
      ...DEFAULT_PAYROLL_SETTINGS.payrollLock,
      ...(stored.payroll_lock
        ? mapObjectKeys(stored.payroll_lock as Record<string, unknown>)
        : stored.payrollLock
          ? mapObjectKeys(stored.payrollLock as Record<string, unknown>)
          : {}),
    },
  });
}

function toStoredPayrollSettings(settings: PayrollSettingsData) {
  return {
    payroll_cycle: settings.payrollCycle,
    payroll_processing_day: settings.payrollProcessingDay,
    salary_credit_date: settings.salaryCreditDate,
    financial_year_start_month: settings.financialYearStartMonth,
    financial_year_end_month: settings.financialYearEndMonth,
    currency: settings.currency,
    working_days_calculation: settings.workingDaysCalculation,
    attendance_rules: {
      minimum_working_hours: settings.attendanceRules.minimumWorkingHours,
      half_day_threshold: settings.attendanceRules.halfDayThreshold,
      late_mark_threshold: settings.attendanceRules.lateMarkThreshold,
      overtime_calculation: settings.attendanceRules.overtimeCalculation,
      auto_calculate_attendance: settings.attendanceRules.autoCalculateAttendance,
      ignore_weekends: settings.attendanceRules.ignoreWeekends,
      ignore_company_holidays: settings.attendanceRules.ignoreCompanyHolidays,
    },
    leave_integration: {
      paid_leave_deduction: settings.leaveIntegration.paidLeaveDeduction,
      loss_of_pay_deduction: settings.leaveIntegration.lossOfPayDeduction,
      half_day_deduction: settings.leaveIntegration.halfDayDeduction,
      sandwich_leave_policy: settings.leaveIntegration.sandwichLeavePolicy,
      include_holidays_in_leave: settings.leaveIntegration.includeHolidaysInLeave,
    },
    salary_components: {
      basic: settings.salaryComponents.basic,
      hra: settings.salaryComponents.hra,
      special_allowance: settings.salaryComponents.specialAllowance,
      medical: settings.salaryComponents.medical,
      travel: settings.salaryComponents.travel,
      pf: settings.salaryComponents.pf,
      esi: settings.salaryComponents.esi,
      professional_tax: settings.salaryComponents.professionalTax,
      income_tax: settings.salaryComponents.incomeTax,
      bonus: settings.salaryComponents.bonus,
      reimbursement: settings.salaryComponents.reimbursement,
      other_deduction: settings.salaryComponents.otherDeduction,
    },
    approval_workflow: settings.approvalWorkflow,
    payslip: {
      company_logo_path: settings.payslip.companyLogoPath,
      company_name: settings.payslip.companyName,
      footer_message: settings.payslip.footerMessage,
      authorized_signature: settings.payslip.authorizedSignature,
      auto_email_payslips: settings.payslip.autoEmailPayslips,
      generate_pdf_automatically: settings.payslip.generatePdfAutomatically,
    },
    notifications: {
      notify_employee: settings.notifications.notifyEmployee,
      notify_finance: settings.notifications.notifyFinance,
      notify_hr: settings.notifications.notifyHr,
      email_payslip: settings.notifications.emailPayslip,
      reminder_before_payroll_run: settings.notifications.reminderBeforePayrollRun,
    },
    payroll_lock: {
      lock_after_approval: settings.payrollLock.lockAfterApproval,
      allow_reopening: settings.payrollLock.allowReopening,
      require_approval_before_unlock:
        settings.payrollLock.requireApprovalBeforeUnlock,
    },
  };
}

async function resolveUserName(
  supabase: AuthSupabaseClient,
  userId: string | null,
): Promise<string | null> {
  if (!userId) return null;

  const { data } = await supabase
    .schema("hrms")
    .from("user_roles")
    .select("employees:employee_id (first_name, last_name)")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  const employee = data?.employees as
    | { first_name: string; last_name: string }
    | { first_name: string; last_name: string }[]
    | null;

  const row = Array.isArray(employee) ? employee[0] : employee;
  return row ? `${row.first_name} ${row.last_name}`.trim() : null;
}

export async function getPayrollSettings(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<PayrollSettingsRecord> {
  const { data, error } = await supabase
    .schema("hrms")
    .from("organization_settings")
    .select(
      "settings, payroll_cycle, currency_code, fiscal_year_start_month, created_at, updated_at, created_by, updated_by",
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);

  const storedPayroll = (data?.settings as { payroll?: unknown } | null)?.payroll;
  const settings = parseStoredPayrollSettings({
    ...(storedPayroll as Record<string, unknown> | undefined),
    payroll_cycle: data?.payroll_cycle,
    currency: data?.currency_code,
    financial_year_start_month: data?.fiscal_year_start_month,
  });

  const [createdByName, updatedByName] = await Promise.all([
    resolveUserName(supabase, data?.created_by ?? null),
    resolveUserName(supabase, data?.updated_by ?? null),
  ]);

  return {
    settings,
    audit: {
      createdAt: data?.created_at ?? new Date().toISOString(),
      updatedAt: data?.updated_at ?? new Date().toISOString(),
      createdByName,
      updatedByName,
    },
  };
}

export async function savePayrollSettings(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: unknown,
): Promise<PayrollSettingsRecord> {
  const parsed = payrollSettingsSchema.parse(input);
  const organizationId = profile.employee.organizationId;

  const { data: existing, error: fetchError } = await supabase
    .schema("hrms")
    .from("organization_settings")
    .select("id, settings")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);

  const currentSettings =
    (existing?.settings as Record<string, unknown> | null) ?? {};
  const payrollPayload = toStoredPayrollSettings(parsed);

  const nextSettings = {
    ...currentSettings,
    payroll: payrollPayload,
  };

  const rowPayload = {
    payroll_cycle: parsed.payrollCycle,
    currency_code: parsed.currency,
    fiscal_year_start_month: parsed.financialYearStartMonth,
    settings: nextSettings,
    updated_by: profile.userId,
  };

  if (existing?.id) {
    const { error } = await supabase
      .schema("hrms")
      .from("organization_settings")
      .update(rowPayload)
      .eq("id", existing.id);

    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.schema("hrms").from("organization_settings").insert({
      organization_id: organizationId,
      ...rowPayload,
      created_by: profile.userId,
    });

    if (error) throw new Error(error.message);
  }

  return getPayrollSettings(supabase, organizationId);
}
