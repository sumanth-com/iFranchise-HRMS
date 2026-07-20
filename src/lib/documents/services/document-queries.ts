import { addDays, format, startOfDay } from "date-fns";

import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { UserProfile } from "@/types/auth";
import { DASHBOARD_CHART_TYPES } from "@/lib/documents/constants";
import {
  DocRow,
  formatEmployeeName,
  fromHrms,
  isEmployeeScoped,
  scopeEmployeeId,
  unwrapRelation,
} from "@/lib/documents/services/documents-utils";
import type {
  DocumentListParams,
  LetterListParams,
} from "@/lib/validations/documents";
import { EMPLOYEE_STORAGE_BUCKETS } from "@/lib/employees/constants";
import { createSignedStorageUrl } from "@/lib/employees/services/employee-mutations";
import type {
  DocumentEmployeeCard,
  DocumentTypeItem,
  DocumentsLookups,
  DocumentsSummary,
  EmployeeDocumentItem,
  EmployeeDocumentListResult,
  EmployeeDocumentProfile,
  ExpiringSummary,
  LetterItem,
  LetterListResult,
  LetterType,
  TemplateItem,
} from "@/types/documents";

function mapDocument(row: DocRow): EmployeeDocumentItem {
  const employee = unwrapRelation(row.employees);
  const dept = unwrapRelation(employee?.departments ?? null);
  const desig = unwrapRelation(employee?.designations ?? null);
  const branch = unwrapRelation(employee?.branches ?? null);
  const docType = unwrapRelation(row.document_types);

  return {
    id: row.id,
    employeeId: row.employee_id,
    employeeCode: employee?.employee_code ?? "—",
    employeeName: formatEmployeeName(employee?.first_name, employee?.last_name),
    departmentName: dept?.name ?? null,
    designationTitle: desig?.title ?? null,
    branchName: branch?.name ?? null,
    documentTypeId: row.document_type_id,
    documentTypeName: docType?.name ?? "Document",
    documentTypeCode: docType?.code ?? "OTHER",
    title: row.title,
    documentNumber: row.document_number ?? null,
    storagePath: row.storage_path,
    fileName: row.file_name,
    mimeType: row.mime_type,
    fileSizeBytes: Number(row.file_size_bytes ?? 0),
    documentStatus: row.document_status,
    source: row.source ?? "upload",
    isOfficial: Boolean(row.is_official),
    issuedDate: row.issued_date ?? null,
    expiryDate: row.expiry_date ?? null,
    verifiedAt: row.verified_at ?? null,
    notes: row.notes ?? null,
    archivedAt: row.archived_at ?? null,
    createdAt: row.created_at,
  };
}

function mapLetter(row: DocRow): LetterItem {
  const employee = unwrapRelation(row.employees);
  const dept = unwrapRelation(employee?.departments ?? null);
  const desig = unwrapRelation(employee?.designations ?? null);
  const template = unwrapRelation(row.document_templates);

  return {
    id: row.id,
    employeeId: row.employee_id,
    employeeCode: employee?.employee_code ?? "—",
    employeeName: formatEmployeeName(employee?.first_name, employee?.last_name),
    departmentName: dept?.name ?? null,
    designationTitle: desig?.title ?? null,
    templateId: row.template_id ?? null,
    templateName: template?.name ?? null,
    employeeDocumentId: row.employee_document_id ?? null,
    letterType: row.letter_type,
    letterNumber: row.letter_number ?? null,
    subject: row.subject ?? null,
    bodyHtml: row.body_html,
    letterStatus: row.letter_status,
    generatedAt: row.generated_at ?? null,
    publishedAt: row.published_at ?? null,
    sourceModule: row.source_module ?? null,
    createdAt: row.created_at,
  };
}

const DOCUMENT_SELECT = `
  id, employee_id, document_type_id, title, document_number, storage_path, file_name,
  mime_type, file_size_bytes, document_status, source, is_official, issued_date,
  expiry_date, verified_at, notes, archived_at, created_at,
  document_types:document_type_id(id, name, code, requires_expiry),
  employees:employee_id!inner(
    employee_code, first_name, last_name, organization_id, department_id,
    departments:department_id(name),
    designations:designation_id(title),
    branches:branch_id(name)
  )
`;

export async function listEmployeeDocuments(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  params: DocumentListParams,
): Promise<EmployeeDocumentListResult> {
  const organizationId = profile.employee.organizationId;
  const scopedEmployeeId = scopeEmployeeId(profile, params.employeeId || null);
  const from = (params.page - 1) * params.pageSize;
  const to = from + params.pageSize - 1;

  let query = fromHrms(supabase, "employee_documents")
    .select(DOCUMENT_SELECT, { count: "exact" })
    .eq("employees.organization_id", organizationId)
    .is("deleted_at", null)
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (scopedEmployeeId) query = query.eq("employee_id", scopedEmployeeId);
  if (params.departmentId) {
    query = query.eq("employees.department_id", params.departmentId);
  }
  if (params.documentTypeId) query = query.eq("document_type_id", params.documentTypeId);
  if (params.documentStatus) query = query.eq("document_status", params.documentStatus);

  if (params.expiringWindow) {
    const today = startOfDay(new Date());
    const todayStr = format(today, "yyyy-MM-dd");
    if (params.expiringWindow === "today") {
      query = query.eq("expiry_date", todayStr);
    } else if (params.expiringWindow === "expired") {
      query = query.lt("expiry_date", todayStr);
    } else {
      const days = Number(params.expiringWindow);
      const end = format(addDays(today, days), "yyyy-MM-dd");
      query = query.gte("expiry_date", todayStr).lte("expiry_date", end);
    }
  }

  if (params.search?.trim()) {
    const q = params.search.trim();
    query = query.or(
      `title.ilike.%${q}%,file_name.ilike.%${q}%,document_number.ilike.%${q}%`,
    );
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return {
    data: (data ?? []).map(mapDocument),
    total: count ?? 0,
    page: params.page,
    pageSize: params.pageSize,
  };
}

export async function getEmployeeDocumentProfile(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  employeeId: string,
): Promise<EmployeeDocumentProfile | null> {
  const organizationId = profile.employee.organizationId;
  const scopedId = scopeEmployeeId(profile, employeeId);

  const { data: employee, error: empError } = await fromHrms(supabase, "employees")
    .select(
      `
      id, employee_code, first_name, last_name,
      departments:department_id(name),
      designations:designation_id(title),
      branches:branch_id(name)
    `,
    )
    .eq("id", scopedId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (empError) throw new Error(empError.message);
  if (!employee) return null;

  const { data: docs, error: docsError } = await fromHrms(supabase, "employee_documents")
    .select(DOCUMENT_SELECT)
    .eq("employee_id", employee.id)
    .is("deleted_at", null)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (docsError) throw new Error(docsError.message);

  return {
    employeeId: employee.id,
    employeeCode: employee.employee_code,
    employeeName: formatEmployeeName(employee.first_name, employee.last_name),
    departmentName: unwrapRelation(employee.departments)?.name ?? null,
    designationTitle: unwrapRelation(employee.designations)?.title ?? null,
    branchName: unwrapRelation(employee.branches)?.name ?? null,
    documents: (docs ?? []).map(mapDocument),
  };
}

export async function listTemplates(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<TemplateItem[]> {
  const { data, error } = await fromHrms(supabase, "document_templates")
    .select("*")
    .eq("organization_id", profile.employee.organizationId)
    .is("deleted_at", null)
    .order("letter_type")
    .order("name");

  if (error) throw new Error(error.message);

  return (data ?? []).map((row: DocRow) => ({
    id: row.id,
    name: row.name,
    letterType: row.letter_type as LetterType,
    documentTypeCode: row.document_type_code,
    subject: row.subject,
    bodyHtml: row.body_html,
    isDefault: Boolean(row.is_default),
    updatedAt: row.updated_at,
  }));
}

export async function getTemplateById(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  templateId: string,
): Promise<TemplateItem | null> {
  const { data, error } = await fromHrms(supabase, "document_templates")
    .select("*")
    .eq("id", templateId)
    .eq("organization_id", profile.employee.organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    letterType: data.letter_type,
    documentTypeCode: data.document_type_code,
    subject: data.subject,
    bodyHtml: data.body_html,
    isDefault: Boolean(data.is_default),
    updatedAt: data.updated_at,
  };
}

export async function listLetters(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  params: LetterListParams,
): Promise<LetterListResult> {
  const organizationId = profile.employee.organizationId;
  const scopedEmployeeId = scopeEmployeeId(profile, params.employeeId || null);
  const from = (params.page - 1) * params.pageSize;
  const to = from + params.pageSize - 1;

  let query = fromHrms(supabase, "document_letters")
    .select(
      `
      id, employee_id, template_id, employee_document_id, letter_type, letter_number,
      subject, body_html, letter_status, generated_at, published_at, source_module, created_at,
      document_templates:template_id(name),
      employees:employee_id!inner(
        employee_code, first_name, last_name, organization_id,
        departments:department_id(name),
        designations:designation_id(title)
      )
    `,
      { count: "exact" },
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (scopedEmployeeId) query = query.eq("employee_id", scopedEmployeeId);
  if (params.letterType) query = query.eq("letter_type", params.letterType);
  if (params.letterStatus) {
    query = query.eq("letter_status", params.letterStatus);
  } else {
    query = query.neq("letter_status", "archived");
  }
  if (params.search?.trim()) {
    const q = params.search.trim();
    query = query.or(`subject.ilike.%${q}%,letter_number.ilike.%${q}%`);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return {
    data: (data ?? []).map(mapLetter),
    total: count ?? 0,
    page: params.page,
    pageSize: params.pageSize,
  };
}

export async function getLetterById(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  letterId: string,
): Promise<LetterItem | null> {
  const { data, error } = await fromHrms(supabase, "document_letters")
    .select(
      `
      id, employee_id, template_id, employee_document_id, letter_type, letter_number,
      subject, body_html, letter_status, generated_at, published_at, source_module, created_at,
      document_templates:template_id(name),
      employees:employee_id!inner(
        employee_code, first_name, last_name,
        departments:department_id(name),
        designations:designation_id(title)
      )
    `,
    )
    .eq("id", letterId)
    .eq("organization_id", profile.employee.organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const letter = mapLetter(data);
  if (isEmployeeScoped(profile) && letter.employeeId !== profile.employee.id) {
    return null;
  }
  return letter;
}

export async function getDocumentsSummary(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<DocumentsSummary> {
  const organizationId = profile.employee.organizationId;
  const scopedEmployeeId = scopeEmployeeId(profile, null);
  const today = format(startOfDay(new Date()), "yyyy-MM-dd");
  const soon = format(addDays(startOfDay(new Date()), 30), "yyyy-MM-dd");
  const monthStart = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), "yyyy-MM-dd");

  let base = fromHrms(supabase, "employee_documents")
    .select(DOCUMENT_SELECT)
    .eq("employees.organization_id", organizationId)
    .is("deleted_at", null)
    .is("archived_at", null);

  if (scopedEmployeeId) base = base.eq("employee_id", scopedEmployeeId);

  const { data, error } = await base.order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const docs: EmployeeDocumentItem[] = (data ?? []).map(mapDocument);
  const pendingVerification = docs.filter((d: EmployeeDocumentItem) => d.documentStatus === "pending").length;
  const expiringSoon = docs.filter(
    (d: EmployeeDocumentItem) => d.expiryDate && d.expiryDate >= today && d.expiryDate <= soon,
  ).length;
  const generatedThisMonth = docs.filter(
    (d: EmployeeDocumentItem) => d.source === "generated" && d.createdAt.slice(0, 10) >= monthStart,
  ).length;
  const uploadedToday = docs.filter((d: EmployeeDocumentItem) => d.createdAt.slice(0, 10) === today).length;

  const typeCounts = new Map<string, { typeCode: string; typeName: string; count: number }>();
  for (const doc of docs) {
    const key = doc.documentTypeCode;
    const existing = typeCounts.get(key);
    if (existing) existing.count += 1;
    else {
      typeCounts.set(key, {
        typeCode: key,
        typeName: doc.documentTypeName,
        count: 1,
      });
    }
  }

  const documentsByType = DASHBOARD_CHART_TYPES.map((code) => {
    const found = typeCounts.get(code);
    return {
      typeCode: code,
      typeName: found?.typeName ?? code.replaceAll("_", " "),
      count: found?.count ?? 0,
    };
  });

  return {
    totalDocuments: docs.length,
    pendingVerification,
    expiringSoon,
    generatedThisMonth,
    uploadedToday,
    documentsByType,
    recentActivity: docs.slice(0, 8).map((d) => ({
      id: d.id,
      title: d.title,
      employeeName: d.employeeName,
      documentTypeName: d.documentTypeName,
      action: d.source === "generated" ? "Generated" : "Uploaded",
      createdAt: d.createdAt,
    })),
    recentUploads: docs.filter((d) => d.source === "upload").slice(0, 8),
  };
}

export async function getExpiringSummary(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<ExpiringSummary> {
  const result = await listEmployeeDocuments(supabase, profile, {
    page: 1,
    pageSize: 500,
    expiringWindow: undefined,
  });

  const today = format(startOfDay(new Date()), "yyyy-MM-dd");
  const in7 = format(addDays(startOfDay(new Date()), 7), "yyyy-MM-dd");
  const in30 = format(addDays(startOfDay(new Date()), 30), "yyyy-MM-dd");

  const withExpiry = result.data.filter((d: EmployeeDocumentItem) => d.expiryDate);
  return {
    expiringToday: withExpiry.filter((d: EmployeeDocumentItem) => d.expiryDate === today).length,
    next7Days: withExpiry.filter(
      (d: EmployeeDocumentItem) => d.expiryDate! > today && d.expiryDate! <= in7,
    ).length,
    next30Days: withExpiry.filter(
      (d: EmployeeDocumentItem) => d.expiryDate! > today && d.expiryDate! <= in30,
    ).length,
    expired: withExpiry.filter((d: EmployeeDocumentItem) => d.expiryDate! < today).length,
  };
}

export async function listDocumentEmployeeCards(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<DocumentEmployeeCard[]> {
  const organizationId = profile.employee.organizationId;
  const scoped = scopeEmployeeId(profile, null);

  let query = fromHrms(supabase, "employees")
    .select(
      `
      id, employee_code, first_name, last_name,
      designations:designation_id (title),
      employee_profiles (profile_image_storage_path)
    `,
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .eq("status", "active")
    .in("employment_status", ["active", "probation", "on_leave"])
    .order("first_name")
    .order("last_name")
    .limit(500);

  if (scoped) query = query.eq("id", scoped);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return Promise.all(
    (data ?? []).map(async (row: DocRow): Promise<DocumentEmployeeCard> => {
      const designation = unwrapRelation(row.designations) as { title?: string } | null;
      const employeeProfile = unwrapRelation(row.employee_profiles) as {
        profile_image_storage_path?: string | null;
      } | null;

      const imagePath = employeeProfile?.profile_image_storage_path ?? null;
      const avatarUrl = imagePath
        ? await createSignedStorageUrl(
            supabase,
            EMPLOYEE_STORAGE_BUCKETS.profileImages,
            imagePath,
          )
        : null;

      const firstName = row.first_name as string;
      const lastName = row.last_name as string;

      return {
        id: row.id as string,
        employeeCode: row.employee_code as string,
        firstName,
        lastName,
        fullName: formatEmployeeName(firstName, lastName),
        designationTitle: designation?.title ?? null,
        avatarUrl,
      };
    }),
  );
}

export async function getDocumentsLookups(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<DocumentsLookups> {
  const organizationId = profile.employee.organizationId;
  const scoped = scopeEmployeeId(profile, null);

  let employeesQuery = fromHrms(supabase, "employees")
    .select("id, employee_code, first_name, last_name")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .eq("status", "active")
    .order("first_name")
    .limit(500);

  if (scoped) employeesQuery = employeesQuery.eq("id", scoped);

  const [employeesRes, departmentsRes, typesRes, templatesRes] = await Promise.all([
    employeesQuery,
    fromHrms(supabase, "departments")
      .select("id, name")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("name"),
    fromHrms(supabase, "document_types")
      .select("id, name, code, description, is_required, requires_expiry")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .eq("status", "active")
      .order("name"),
    fromHrms(supabase, "document_templates")
      .select("id, name, letter_type")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("name"),
  ]);

  if (employeesRes.error) throw new Error(employeesRes.error.message);
  if (departmentsRes.error) throw new Error(departmentsRes.error.message);
  if (typesRes.error) throw new Error(typesRes.error.message);
  if (templatesRes.error) throw new Error(templatesRes.error.message);

  return {
    employees: (employeesRes.data ?? []).map((e: DocRow) => ({
      id: e.id,
      label: `${e.employee_code} — ${formatEmployeeName(e.first_name, e.last_name)}`,
    })),
    departments: (departmentsRes.data ?? []).map((d: DocRow) => ({
      id: d.id,
      label: d.name,
    })),
    documentTypes: (typesRes.data ?? []).map(
      (t: DocRow): DocumentTypeItem => ({
        id: t.id,
        name: t.name,
        code: t.code,
        description: t.description,
        isRequired: Boolean(t.is_required),
        requiresExpiry: Boolean(t.requires_expiry),
      }),
    ),
    templates: (templatesRes.data ?? []).map((t: DocRow) => ({
      id: t.id,
      label: t.name,
      letterType: t.letter_type as LetterType,
    })),
  };
}

export async function getDocumentTypeIdByCode(
  supabase: AuthSupabaseClient,
  organizationId: string,
  code: string,
): Promise<string | null> {
  const { data, error } = await fromHrms(supabase, "document_types")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("code", code)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data?.id ?? null;
}
