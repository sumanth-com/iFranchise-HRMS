import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { DEFAULT_PAYROLL_POLICY_DOCUMENT } from "@/lib/payroll/payroll-policy-defaults";
import type { PayrollPolicyDocument } from "@/types/payroll-policy";

function isLegacyPayrollPolicyDocument(value: Partial<PayrollPolicyDocument>): boolean {
  const sectionIds = value.sections?.map((section) => section.id) ?? [];
  return (
    sectionIds.includes("salary-cycle") ||
    sectionIds.includes("payslips") ||
    sectionIds.includes("pf") ||
    sectionIds.includes("queries") ||
    sectionIds.includes("tds") ||
    sectionIds.includes("tax-documents")
  );
}

function parsePayrollPolicyDocument(
  settings: Record<string, unknown> | null,
): PayrollPolicyDocument {
  const raw = settings?.payroll_policy_document;
  if (!raw || typeof raw !== "object") {
    return DEFAULT_PAYROLL_POLICY_DOCUMENT;
  }

  const value = raw as Partial<PayrollPolicyDocument>;
  if (!value.intro || !Array.isArray(value.sections) || value.sections.length === 0) {
    return DEFAULT_PAYROLL_POLICY_DOCUMENT;
  }

  if (isLegacyPayrollPolicyDocument(value)) {
    return DEFAULT_PAYROLL_POLICY_DOCUMENT;
  }

  return {
    intro: value.intro,
    sections: value.sections.map((section) => ({
      id: section.id,
      title: section.title,
      content: section.content,
    })),
    contact: {
      phone: value.contact?.phone ?? DEFAULT_PAYROLL_POLICY_DOCUMENT.contact.phone,
      email: value.contact?.email ?? DEFAULT_PAYROLL_POLICY_DOCUMENT.contact.email,
      address: value.contact?.address ?? DEFAULT_PAYROLL_POLICY_DOCUMENT.contact.address,
    },
    updatedAt: value.updatedAt ?? null,
  };
}

export async function getPayrollPolicyDocument(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<PayrollPolicyDocument> {
  const { data, error } = await supabase
    .schema("hrms")
    .from("organization_settings")
    .select("settings")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return parsePayrollPolicyDocument(
    (data?.settings as Record<string, unknown> | null) ?? null,
  );
}
