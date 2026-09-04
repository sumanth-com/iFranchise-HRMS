import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import {
  getBankAccountValidationMessage,
  getIfscValidationMessage,
  isValidBankAccountNumber,
  isValidIfsc,
  sanitizeAccountNumber,
  sanitizeIfsc,
} from "@/lib/onboarding/bank-field-utils";
import {
  isValidAadhaar,
  isValidPan,
  sanitizeAadhaar,
  sanitizePan,
} from "@/lib/onboarding/identity-field-utils";
import { resolveBankNameFromIfsc, resolveEmployeeBankName } from "@/lib/payroll/services/ifsc-bank-names";
import type { UserProfile } from "@/types/auth";
import type { EmployeeAccountFormInput, PayslipBankAccountSnapshot } from "@/types/employee-accounts";
import type { PayrollBreakdown } from "@/types/payroll";

function actorUserId(profile: UserProfile): string {
  return profile.userId;
}

function normalizeDateOfBirth(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (match) {
    return `${match[3]}-${match[2]}-${match[1]}`;
  }
  return null;
}

export function validateEmployeeAccountInput(input: EmployeeAccountFormInput): string | null {
  if (input.aadhaarNumber?.trim() && !isValidAadhaar(input.aadhaarNumber)) {
    return "Aadhaar must be exactly 12 digits.";
  }
  if (input.panNumber?.trim() && !isValidPan(input.panNumber)) {
    return "PAN must follow the format ABCDE1234F.";
  }
  const accountMsg = getBankAccountValidationMessage(input.accountNumber);
  if (accountMsg) return accountMsg;
  const ifscMsg = getIfscValidationMessage(input.ifscCode);
  if (ifscMsg) return ifscMsg;

  const hasBankFields =
    Boolean(input.accountNumber?.trim()) ||
    Boolean(input.ifscCode?.trim()) ||
    Boolean(input.bankName?.trim());

  if (hasBankFields) {
    if (!input.accountNumber?.trim() || !isValidBankAccountNumber(input.accountNumber)) {
      return "Account number is required and must be 9–18 digits.";
    }
    if (!input.ifscCode?.trim() || !isValidIfsc(input.ifscCode)) {
      return "Valid IFSC code is required when bank details are provided.";
    }
  }

  return null;
}

export async function upsertEmployeeAccount(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: EmployeeAccountFormInput,
): Promise<{ employeeId: string }> {
  const validationError = validateEmployeeAccountInput(input);
  if (validationError) {
    throw new Error(validationError);
  }

  const organizationId = profile.employee.organizationId;
  const actorId = actorUserId(profile);

  const { data: employee, error: employeeError } = await supabase
    .schema("hrms")
    .from("employees")
    .select("id, first_name, last_name, employee_code")
    .eq("id", input.employeeId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (employeeError) throw new Error(employeeError.message);
  if (!employee) throw new Error("Employee not found.");

  const fullName = `${employee.first_name} ${employee.last_name}`.trim();
  const dateOfBirth = normalizeDateOfBirth(input.dateOfBirth);
  const aadhaarNumber = input.aadhaarNumber?.trim()
    ? sanitizeAadhaar(input.aadhaarNumber)
    : null;
  const panNumber = input.panNumber?.trim() ? sanitizePan(input.panNumber) : null;

  const { data: existingProfile } = await supabase
    .schema("hrms")
    .from("employee_profiles")
    .select("id")
    .eq("employee_id", employee.id)
    .maybeSingle();

  const profilePayload = {
    date_of_birth: dateOfBirth,
    pan_number: panNumber,
    aadhaar_number: aadhaarNumber,
    status: "active",
    updated_at: new Date().toISOString(),
  };

  if (existingProfile?.id) {
    const { error } = await supabase
      .schema("hrms")
      .from("employee_profiles")
      .update(profilePayload)
      .eq("id", existingProfile.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.schema("hrms").from("employee_profiles").insert({
      employee_id: employee.id,
      ...profilePayload,
    });
    if (error) throw new Error(error.message);
  }

  const accountNumber = input.accountNumber?.trim()
    ? sanitizeAccountNumber(input.accountNumber)
    : "";
  const ifscCode = input.ifscCode?.trim() ? sanitizeIfsc(input.ifscCode) : "";
  const accountHolderName = (input.accountHolderName?.trim() || fullName).trim();
  const branchName = input.branchName?.trim() || null;
  const accountType = input.accountType ?? "salary";
  const bankName =
    resolveEmployeeBankName(input.bankName, ifscCode) ||
    resolveBankNameFromIfsc(ifscCode) ||
    input.bankName?.trim() ||
    "Bank";

  if (accountNumber && ifscCode) {
    const { data: existingBank } = await supabase
      .schema("hrms")
      .from("bank_accounts")
      .select("id")
      .eq("employee_id", employee.id)
      .eq("is_primary", true)
      .is("deleted_at", null)
      .maybeSingle();

    const bankPayload = {
      bank_name: bankName,
      account_holder_name: accountHolderName,
      account_number: accountNumber,
      ifsc_code: ifscCode,
      branch_name: branchName,
      account_type: accountType,
      is_primary: true,
      status: "active",
      updated_by: actorId,
    };

    if (existingBank?.id) {
      const { error } = await supabase
        .schema("hrms")
        .from("bank_accounts")
        .update(bankPayload)
        .eq("id", existingBank.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.schema("hrms").from("bank_accounts").insert({
        employee_id: employee.id,
        ...bankPayload,
        created_by: actorId,
      });
      if (error) throw new Error(error.message);
    }
  }

  if (panNumber || aadhaarNumber) {
    const { data: structures } = await supabase
      .schema("hrms")
      .from("salary_structures")
      .select("id, components")
      .eq("employee_id", employee.id)
      .is("deleted_at", null)
      .eq("status", "active");

    for (const structure of structures ?? []) {
      const components = (structure.components as Record<string, unknown> | null) ?? {};
      const nextComponents = {
        ...components,
        ...(panNumber ? { pan_number: panNumber } : {}),
        ...(aadhaarNumber ? { aadhaar_number: aadhaarNumber } : {}),
      };
      await supabase
        .schema("hrms")
        .from("salary_structures")
        .update({
          components: nextComponents,
          updated_by: actorId,
        })
        .eq("id", structure.id);
    }
  }

  return { employeeId: employee.id };
}

export async function loadPrimaryBankSnapshot(
  supabase: AuthSupabaseClient,
  employeeId: string,
): Promise<PayslipBankAccountSnapshot | null> {
  const { data: bankAccount, error } = await supabase
    .schema("hrms")
    .from("bank_accounts")
    .select("bank_name, account_number, ifsc_code, account_holder_name, branch_name")
    .eq("employee_id", employeeId)
    .eq("is_primary", true)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!bankAccount?.account_number) return null;

  return {
    bankName: resolveEmployeeBankName(bankAccount.bank_name, bankAccount.ifsc_code),
    accountHolderName: bankAccount.account_holder_name ?? "",
    accountNumber: bankAccount.account_number,
    ifscCode: bankAccount.ifsc_code ?? null,
    branchName: bankAccount.branch_name ?? null,
  };
}

export function resolvePayslipBankAccount(
  breakdown: PayrollBreakdown | null | undefined,
  liveBank: {
    bank_name: string;
    account_number: string;
    ifsc_code: string | null;
    account_holder_name: string | null;
    branch_name?: string | null;
  } | null,
  isReleased: boolean,
): PayslipBankAccountSnapshot | null {
  const snapshot = breakdown?.bankAccountSnapshot;
  if (isReleased && snapshot?.accountNumber) {
    return snapshot;
  }
  if (!liveBank?.account_number) return null;
  return {
    bankName: resolveEmployeeBankName(liveBank.bank_name, liveBank.ifsc_code),
    accountHolderName: liveBank.account_holder_name ?? "",
    accountNumber: liveBank.account_number,
    ifscCode: liveBank.ifsc_code ?? null,
    branchName: liveBank.branch_name ?? null,
  };
}
