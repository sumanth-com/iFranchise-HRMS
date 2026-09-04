import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { DEFAULT_ATTENDANCE_POLICY_DOCUMENT } from "@/lib/attendance/attendance-policy-defaults";
import { DEFAULT_INTERN_PROBATION_ATTENDANCE_POLICY } from "@/lib/leave/leave-attendance-absence-policy-content";
import type { AttendancePolicyDocument } from "@/types/attendance-policy";

export type AttendancePolicyPageData = {
  document: AttendancePolicyDocument;
  internProbationDocument: AttendancePolicyDocument;
};

function isLegacyAttendancePolicyDocument(value: Partial<AttendancePolicyDocument>): boolean {
  const sectionIds = value.sections?.map((section) => section.id) ?? [];
  return (
    sectionIds.includes("payroll-attendance-update") ||
    sectionIds.includes("weekly-offs") ||
    sectionIds.includes("resumption-rule")
  );
}

function parseAttendancePolicyDocument(
  settings: Record<string, unknown> | null,
): AttendancePolicyDocument {
  const raw = settings?.attendance_policy_document;
  if (!raw || typeof raw !== "object") {
    return DEFAULT_ATTENDANCE_POLICY_DOCUMENT;
  }

  const value = raw as Partial<AttendancePolicyDocument>;
  if (!value.intro || !Array.isArray(value.sections) || value.sections.length === 0) {
    return DEFAULT_ATTENDANCE_POLICY_DOCUMENT;
  }

  if (isLegacyAttendancePolicyDocument(value)) {
    return DEFAULT_ATTENDANCE_POLICY_DOCUMENT;
  }

  return {
    intro: value.intro,
    sections: value.sections.map((section) => ({
      id: section.id,
      title: section.title,
      content: section.content,
    })),
    contact: {
      phone: value.contact?.phone ?? DEFAULT_ATTENDANCE_POLICY_DOCUMENT.contact.phone,
      email: value.contact?.email ?? DEFAULT_ATTENDANCE_POLICY_DOCUMENT.contact.email,
      address: value.contact?.address ?? DEFAULT_ATTENDANCE_POLICY_DOCUMENT.contact.address,
    },
    updatedAt: value.updatedAt ?? null,
  };
}

export async function getAttendancePolicyDocument(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<AttendancePolicyPageData> {
  const { data, error } = await supabase
    .schema("hrms")
    .from("organization_settings")
    .select("settings")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return {
    document: parseAttendancePolicyDocument(
      (data?.settings as Record<string, unknown> | null) ?? null,
    ),
    internProbationDocument: DEFAULT_INTERN_PROBATION_ATTENDANCE_POLICY,
  };
}
