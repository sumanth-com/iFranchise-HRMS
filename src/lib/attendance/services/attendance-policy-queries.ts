import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { DEFAULT_ATTENDANCE_POLICY_DOCUMENT } from "@/lib/attendance/attendance-policy-defaults";
import type { AttendancePolicyDocument } from "@/types/attendance-policy";

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
): Promise<AttendancePolicyDocument> {
  const { data, error } = await supabase
    .schema("hrms")
    .from("organization_settings")
    .select("settings")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return parseAttendancePolicyDocument(
    (data?.settings as Record<string, unknown> | null) ?? null,
  );
}
