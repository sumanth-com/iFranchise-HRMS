"use server";

import { revalidatePath } from "next/cache";

import { ORGANIZATION_ROUTES } from "@/lib/organization/constants";
import {
  deleteBranch,
  deleteDepartment,
  deleteDesignation,
  deleteEmploymentType,
  deleteHoliday,
  deleteShiftTemplate,
  deleteWorkLocation,
  importHolidaysFromCsv,
  saveBranch,
  saveDepartment,
  saveDesignation,
  saveEmploymentType,
  saveHoliday,
  saveShiftTemplate,
  saveWorkLocation,
  updateOrganizationProfile,
  updateReportingManager,
} from "@/lib/organization/services/org-mutations";
import {
  listBranches,
  listDepartments,
  listDesignations,
  listEmploymentTypes,
  listHolidays,
  listShiftTemplates,
  listWorkLocations,
  searchOrganization,
} from "@/lib/organization/services/org-queries";
import {
  exportBranches,
  exportDepartments,
  exportDesignations,
  exportEmploymentTypes,
  exportHolidays,
  exportShiftTemplates,
  exportWorkLocations,
} from "@/lib/organization/services/org-export";
import {
  requireServerAnyPermission,
} from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import {
  branchFormSchema,
  departmentFormSchema,
  designationFormSchema,
  employmentTypeFormSchema,
  hierarchyUpdateSchema,
  holidayFormSchema,
  orgSearchSchema,
  organizationProfileSchema,
  shiftTemplateFormSchema,
  workLocationFormSchema,
} from "@/lib/validations/organization";
import type { OrganizationActionResult, OrgExportFormat } from "@/types/organization";

function revalidateOrganization() {
  for (const route of Object.values(ORGANIZATION_ROUTES)) {
    revalidatePath(route);
  }
  revalidatePath("/dashboard/employees");
  revalidatePath("/dashboard/leave");
  revalidatePath("/dashboard/attendance");
}

export async function saveOrganizationProfileAction(
  input: unknown,
): Promise<OrganizationActionResult> {
  try {
    const profile = await requireServerAnyPermission(["organization.edit"]);
    const supabase = await createClient();
    const parsed = organizationProfileSchema.parse(input);
    await updateOrganizationProfile(supabase, profile, parsed);
    revalidateOrganization();
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to save profile",
    };
  }
}

export async function saveBranchAction(
  input: unknown,
  id?: string,
): Promise<OrganizationActionResult<string>> {
  try {
    const profile = await requireServerAnyPermission(
      id ? ["organization.edit", "branch.edit"] : ["organization.create", "branch.create"],
    );
    const supabase = await createClient();
    const parsed = branchFormSchema.parse(input);
    const resultId = await saveBranch(supabase, profile, parsed, id);
    revalidateOrganization();
    return { success: true, data: resultId };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to save branch",
    };
  }
}

export async function deleteBranchAction(id: string): Promise<OrganizationActionResult> {
  try {
    const profile = await requireServerAnyPermission(["organization.delete", "branch.delete"]);
    const supabase = await createClient();
    await deleteBranch(supabase, profile, id);
    revalidateOrganization();
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to delete branch",
    };
  }
}

export async function saveDepartmentAction(
  input: unknown,
  id?: string,
): Promise<OrganizationActionResult<string>> {
  try {
    const profile = await requireServerAnyPermission(
      id ? ["organization.edit", "department.edit"] : ["organization.create", "department.create"],
    );
    const supabase = await createClient();
    const parsed = departmentFormSchema.parse(input);
    const resultId = await saveDepartment(supabase, profile, parsed, id);
    revalidateOrganization();
    return { success: true, data: resultId };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to save department",
    };
  }
}

export async function deleteDepartmentAction(id: string): Promise<OrganizationActionResult> {
  try {
    const profile = await requireServerAnyPermission([
      "organization.delete",
      "department.delete",
    ]);
    const supabase = await createClient();
    await deleteDepartment(supabase, profile, id);
    revalidateOrganization();
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to delete department",
    };
  }
}

export async function saveDesignationAction(
  input: unknown,
  id?: string,
): Promise<OrganizationActionResult<string>> {
  try {
    const profile = await requireServerAnyPermission(
      id
        ? ["organization.edit", "designation.edit"]
        : ["organization.create", "designation.create"],
    );
    const supabase = await createClient();
    const parsed = designationFormSchema.parse(input);
    const resultId = await saveDesignation(supabase, profile, parsed, id);
    revalidateOrganization();
    return { success: true, data: resultId };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to save designation",
    };
  }
}

export async function deleteDesignationAction(id: string): Promise<OrganizationActionResult> {
  try {
    const profile = await requireServerAnyPermission([
      "organization.delete",
      "designation.delete",
    ]);
    const supabase = await createClient();
    await deleteDesignation(supabase, profile, id);
    revalidateOrganization();
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to delete designation",
    };
  }
}

export async function saveEmploymentTypeAction(
  input: unknown,
  id?: string,
): Promise<OrganizationActionResult<string>> {
  try {
    const profile = await requireServerAnyPermission(
      id
        ? ["organization.edit", "employment_type.edit"]
        : ["organization.create", "employment_type.create"],
    );
    const supabase = await createClient();
    const parsed = employmentTypeFormSchema.parse(input);
    const resultId = await saveEmploymentType(supabase, profile, parsed, id);
    revalidateOrganization();
    return { success: true, data: resultId };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to save employment type",
    };
  }
}

export async function deleteEmploymentTypeAction(id: string): Promise<OrganizationActionResult> {
  try {
    const profile = await requireServerAnyPermission([
      "organization.delete",
      "employment_type.delete",
    ]);
    const supabase = await createClient();
    await deleteEmploymentType(supabase, profile, id);
    revalidateOrganization();
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to delete employment type",
    };
  }
}

export async function saveWorkLocationAction(
  input: unknown,
  id?: string,
): Promise<OrganizationActionResult<string>> {
  try {
    const profile = await requireServerAnyPermission(
      id
        ? ["organization.edit", "work_location.edit"]
        : ["organization.create", "work_location.create"],
    );
    const supabase = await createClient();
    const parsed = workLocationFormSchema.parse(input);
    const resultId = await saveWorkLocation(supabase, profile, parsed, id);
    revalidateOrganization();
    return { success: true, data: resultId };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to save work location",
    };
  }
}

export async function deleteWorkLocationAction(id: string): Promise<OrganizationActionResult> {
  try {
    const profile = await requireServerAnyPermission([
      "organization.delete",
      "work_location.delete",
    ]);
    const supabase = await createClient();
    await deleteWorkLocation(supabase, profile, id);
    revalidateOrganization();
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to delete work location",
    };
  }
}

export async function saveHolidayAction(
  input: unknown,
  id?: string,
): Promise<OrganizationActionResult<string>> {
  try {
    const profile = await requireServerAnyPermission([
      "holiday.manage",
      "organization.create",
      "organization.edit",
    ]);
    const supabase = await createClient();
    const parsed = holidayFormSchema.parse(input);
    const resultId = await saveHoliday(supabase, profile, parsed, id);
    revalidateOrganization();
    return { success: true, data: resultId };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to save holiday",
    };
  }
}

export async function deleteHolidayAction(id: string): Promise<OrganizationActionResult> {
  try {
    const profile = await requireServerAnyPermission([
      "holiday.manage",
      "organization.delete",
    ]);
    const supabase = await createClient();
    await deleteHoliday(supabase, profile, id);
    revalidateOrganization();
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to delete holiday",
    };
  }
}

export async function saveShiftTemplateAction(
  input: unknown,
  id?: string,
): Promise<OrganizationActionResult<string>> {
  try {
    const profile = await requireServerAnyPermission(
      id
        ? ["organization.edit", "shift_template.edit"]
        : ["organization.create", "shift_template.create"],
    );
    const supabase = await createClient();
    const parsed = shiftTemplateFormSchema.parse(input);
    const resultId = await saveShiftTemplate(supabase, profile, parsed, id);
    revalidateOrganization();
    return { success: true, data: resultId };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to save shift template",
    };
  }
}

export async function deleteShiftTemplateAction(id: string): Promise<OrganizationActionResult> {
  try {
    const profile = await requireServerAnyPermission([
      "organization.delete",
      "shift_template.delete",
    ]);
    const supabase = await createClient();
    await deleteShiftTemplate(supabase, profile, id);
    revalidateOrganization();
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to delete shift template",
    };
  }
}

export async function updateHierarchyAction(
  input: unknown,
): Promise<OrganizationActionResult> {
  try {
    const profile = await requireServerAnyPermission(["organization.edit", "employee.edit"]);
    const supabase = await createClient();
    const parsed = hierarchyUpdateSchema.parse(input);
    await updateReportingManager(
      supabase,
      profile,
      parsed.employeeId,
      parsed.reportingManagerId,
    );
    revalidateOrganization();
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to update hierarchy",
    };
  }
}

export async function searchOrganizationAction(
  query: string,
): Promise<OrganizationActionResult<Awaited<ReturnType<typeof searchOrganization>>>> {
  try {
    const profile = await requireServerAnyPermission([...["organization.view"]]);
    const supabase = await createClient();
    const parsed = orgSearchSchema.parse({ query });
    const data = await searchOrganization(
      supabase,
      profile.employee.organizationId,
      parsed.query,
    );
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Search failed",
    };
  }
}

export async function exportOrganizationDataAction(
  entity: "branches" | "departments" | "designations" | "employment-types" | "work-locations" | "holidays" | "shifts",
  format: OrgExportFormat,
  year?: number,
): Promise<OrganizationActionResult<{ content: string; filename: string; mimeType: string }>> {
  try {
    const profile = await requireServerAnyPermission(["organization.view"]);
    const supabase = await createClient();
    const orgId = profile.employee.organizationId;

    let content: string;
    let filename: string;
    const ext = format === "excel" ? "xls" : "csv";
    const mimeType =
      format === "excel"
        ? "application/vnd.ms-excel"
        : "text/csv;charset=utf-8";

    switch (entity) {
      case "branches": {
        const result = await listBranches(supabase, orgId, { page: 1, pageSize: 1000 });
        content = exportBranches(result.data, format);
        filename = `branches.${ext}`;
        break;
      }
      case "departments": {
        const result = await listDepartments(supabase, orgId, { page: 1, pageSize: 1000 });
        content = exportDepartments(result.data, format);
        filename = `departments.${ext}`;
        break;
      }
      case "designations": {
        const result = await listDesignations(supabase, orgId, { page: 1, pageSize: 1000 });
        content = exportDesignations(result.data, format);
        filename = `designations.${ext}`;
        break;
      }
      case "employment-types": {
        const data = await listEmploymentTypes(supabase, orgId);
        content = exportEmploymentTypes(data, format);
        filename = `employment-types.${ext}`;
        break;
      }
      case "work-locations": {
        const result = await listWorkLocations(supabase, orgId, { page: 1, pageSize: 1000 });
        content = exportWorkLocations(result.data, format);
        filename = `work-locations.${ext}`;
        break;
      }
      case "holidays": {
        const result = await listHolidays(supabase, orgId, { year });
        content = exportHolidays(result.data, format);
        filename = `holidays-${result.year}.${ext}`;
        break;
      }
      case "shifts": {
        const data = await listShiftTemplates(supabase, orgId);
        content = exportShiftTemplates(data, format);
        filename = `shift-templates.${ext}`;
        break;
      }
      default:
        throw new Error("Unknown entity");
    }

    return { success: true, data: { content, filename, mimeType } };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Export failed",
    };
  }
}

export async function importHolidaysAction(
  csvContent: string,
): Promise<OrganizationActionResult<{ imported: number }>> {
  try {
    const profile = await requireServerAnyPermission([
      "holiday.manage",
      "organization.create",
    ]);
    const supabase = await createClient();
    const imported = await importHolidaysFromCsv(supabase, profile, csvContent);
    revalidateOrganization();
    return { success: true, data: { imported } };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Import failed",
    };
  }
}
