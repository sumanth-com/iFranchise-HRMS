import { format, parseISO } from "date-fns";

import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { DEFAULT_LEAVE_POLICY_DOCUMENT, DEFAULT_INTERN_PROBATION_LEAVE_POLICY } from "@/lib/leave/leave-policy-defaults";
import { hidePeriodLeaveFromPolicyDocument } from "@/lib/leave/leave-policy-employee-display";
import { listHolidays } from "@/lib/organization/services/org-queries";
import type {
  LeavePolicyDocument,
  LeavePolicyHolidayRow,
  LeavePolicyPageData,
} from "@/types/leave-policy";

function isLegacyLeavePolicyDocument(value: Partial<LeavePolicyDocument>): boolean {
  const sectionIds = value.sections?.map((section) => section.id) ?? [];
  return (
    sectionIds.includes("communication-guidelines") ||
    sectionIds.includes("sales-confirmation") ||
    sectionIds.includes("post-probation-carry-forward") ||
    sectionIds.includes("planned-leave-timelines") ||
    sectionIds.includes("emergency-leave")
  );
}

function parseLeavePolicyDocument(settings: Record<string, unknown> | null): LeavePolicyDocument {
  const raw = settings?.leave_policy_document;
  if (!raw || typeof raw !== "object") {
    return DEFAULT_LEAVE_POLICY_DOCUMENT;
  }

  const value = raw as Partial<LeavePolicyDocument>;
  if (!value.intro || !Array.isArray(value.sections) || value.sections.length === 0) {
    return DEFAULT_LEAVE_POLICY_DOCUMENT;
  }

  if (isLegacyLeavePolicyDocument(value)) {
    return DEFAULT_LEAVE_POLICY_DOCUMENT;
  }

  return {
    intro: value.intro,
    sections: value.sections.map((section) => ({
      id: section.id,
      title: section.title,
      content: section.content,
    })),
    contact: {
      phone: value.contact?.phone ?? DEFAULT_LEAVE_POLICY_DOCUMENT.contact.phone,
      email: value.contact?.email ?? DEFAULT_LEAVE_POLICY_DOCUMENT.contact.email,
      address: value.contact?.address ?? DEFAULT_LEAVE_POLICY_DOCUMENT.contact.address,
    },
    updatedAt: value.updatedAt ?? null,
  };
}

function toHolidayRow(
  holiday: { id: string; name: string; holidayDate: string; isOptional: boolean },
): LeavePolicyHolidayRow {
  const date = parseISO(holiday.holidayDate);
  return {
    id: holiday.id,
    name: holiday.name,
    date: format(date, "dd.MM.yyyy"),
    day: format(date, "EEEE"),
    isoDate: holiday.holidayDate,
    isOptional: holiday.isOptional,
  };
}

export async function getLeavePolicyPageData(
  supabase: AuthSupabaseClient,
  organizationId: string,
  year = new Date().getFullYear(),
): Promise<LeavePolicyPageData> {
  const [settingsResult, holidaysResult] = await Promise.all([
    supabase
      .schema("hrms")
      .from("organization_settings")
      .select("settings")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .maybeSingle(),
    listHolidays(supabase, organizationId, { year }),
  ]);

  if (settingsResult.error) {
    throw new Error(settingsResult.error.message);
  }

  const document = hidePeriodLeaveFromPolicyDocument(
    parseLeavePolicyDocument(
      (settingsResult.data?.settings as Record<string, unknown> | null) ?? null,
    ),
  );

  const mandatoryHolidays = holidaysResult.data
    .filter((holiday) => !holiday.isOptional)
    .map(toHolidayRow);
  const optionalHolidays = holidaysResult.data
    .filter((holiday) => holiday.isOptional)
    .map(toHolidayRow);

  return {
    document,
    internProbationDocument: DEFAULT_INTERN_PROBATION_LEAVE_POLICY,
    mandatoryHolidays,
    optionalHolidays,
    holidayYear: holidaysResult.year,
  };
}
