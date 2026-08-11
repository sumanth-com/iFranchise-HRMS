import { CompanyLettersManagement } from "@/components/documents/company-letters-management";
import { DocumentsSettingsForm } from "@/components/documents/documents-settings-form";
import { EmployeeDocumentsManagement } from "@/components/documents/employee-documents-management";
import { ExpiringDocumentsManagement } from "@/components/documents/expiring-documents-management";
import { TemplatesManagement } from "@/components/documents/templates-management";
import {
  canManageDocumentSettings,
  TEAM_DOCUMENTS_SECTIONS,
  type TeamDocumentsSection,
} from "@/lib/documents/constants";
import type { requireServerPermission } from "@/lib/permissions/server";
import { getDocumentSettings } from "@/lib/documents/services/document-settings";
import {
  getDocumentsLookups,
  getExpiringSummary,
  listDocumentEmployeeCards,
  listEmployeeDocuments,
  listLetters,
  listTemplates,
} from "@/lib/documents/services/document-queries";
import type { createClient } from "@/lib/supabase/server";
import {
  documentListParamsSchema,
  letterListParamsSchema,
} from "@/lib/validations/documents";

function firstString(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

type TeamDocumentsSectionProps = {
  section: TeamDocumentsSection;
  rawSearchParams: Record<string, string | string[] | undefined>;
  profile: Awaited<ReturnType<typeof requireServerPermission>>;
  supabase: Awaited<ReturnType<typeof createClient>>;
};

export async function TeamDocumentsSection({
  section,
  rawSearchParams,
  profile,
  supabase,
}: TeamDocumentsSectionProps) {
  if (section === TEAM_DOCUMENTS_SECTIONS.employees) {
    const employees = await listDocumentEmployeeCards(supabase, profile);
    return <EmployeeDocumentsManagement employees={employees} embedded />;
  }

  if (section === TEAM_DOCUMENTS_SECTIONS.expiring) {
    const params = documentListParamsSchema.parse({
      page: rawSearchParams.page,
      pageSize: rawSearchParams.pageSize ?? 50,
      expiringWindow: firstString(rawSearchParams.expiringWindow) ?? "30",
    });

    const [summary, result, lookups] = await Promise.all([
      getExpiringSummary(supabase, profile),
      listEmployeeDocuments(supabase, profile, params),
      getDocumentsLookups(supabase, profile),
    ]);

    return (
      <ExpiringDocumentsManagement
        summary={summary}
        result={result}
        lookups={lookups}
        permissionCodes={profile.permissionCodes}
        embedded
      />
    );
  }

  if (section === TEAM_DOCUMENTS_SECTIONS.letters) {
    const params = letterListParamsSchema.parse({
      page: rawSearchParams.page,
      pageSize: rawSearchParams.pageSize,
      search: firstString(rawSearchParams.search),
      employeeId: firstString(rawSearchParams.employeeId),
      letterType: firstString(rawSearchParams.letterType),
      letterStatus: firstString(rawSearchParams.letterStatus),
    });

    const [result, lookups] = await Promise.all([
      listLetters(supabase, profile, params),
      getDocumentsLookups(supabase, profile),
    ]);

    return (
      <CompanyLettersManagement
        result={result}
        lookups={lookups}
        permissionCodes={profile.permissionCodes}
        embedded
      />
    );
  }

  if (section === TEAM_DOCUMENTS_SECTIONS.templates) {
    const templates = await listTemplates(supabase, profile);
    return (
      <TemplatesManagement
        templates={templates}
        permissionCodes={profile.permissionCodes}
        embedded
      />
    );
  }

  if (section === TEAM_DOCUMENTS_SECTIONS.settings) {
    const settings = await getDocumentSettings(supabase, profile.employee.organizationId);
    return (
      <DocumentsSettingsForm
        settings={settings}
        canEdit={canManageDocumentSettings(profile.permissionCodes)}
        embedded
      />
    );
  }

  return null;
}
