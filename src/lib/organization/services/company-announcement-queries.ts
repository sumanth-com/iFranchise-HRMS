import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import {
  COMPANY_ANNOUNCEMENT_BUCKET,
} from "@/lib/organization/company-announcement-constants";
import { fromHrms } from "@/lib/reports/services/reports-utils";
import { createSignedStorageUrls } from "@/lib/storage/signed-url";
import type {
  AcknowledgementProof,
  AcknowledgementTracker,
  AcknowledgementTrackerRow,
  CompanyAnnouncementAttachment,
  CompanyAnnouncementDetail,
  CompanyAnnouncementEmployeeView,
  CompanyAnnouncementIconKey,
  CompanyAnnouncementListItem,
} from "@/types/company-announcement";
import { COMPANY_ANNOUNCEMENT_ICON_KEYS } from "@/types/company-announcement";

type LooseRow = Record<string, unknown>;

const AUDIENCE_EMPLOYMENT_STATUSES = ["active", "probation", "on_leave"];

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function asStringOrNull(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asIconKey(value: unknown): CompanyAnnouncementIconKey {
  const key = asString(value);
  return COMPANY_ANNOUNCEMENT_ICON_KEYS.includes(key as CompanyAnnouncementIconKey)
    ? (key as CompanyAnnouncementIconKey)
    : "megaphone";
}

async function mapAttachments(
  supabase: AuthSupabaseClient,
  rows: LooseRow[],
): Promise<CompanyAnnouncementAttachment[]> {
  const signed = await createSignedStorageUrls(
    supabase,
    COMPANY_ANNOUNCEMENT_BUCKET,
    rows.map((row) => asStringOrNull(row.storage_path)),
  );
  return rows.map((row) => {
    const path = asString(row.storage_path);
    return {
      id: asString(row.id),
      fileName: asString(row.file_name),
      mimeType: asStringOrNull(row.mime_type),
      fileSize: typeof row.file_size === "number" ? row.file_size : null,
      storagePath: path,
      url: signed.get(path) ?? null,
    };
  });
}

function isMissingAnnouncementTable(message?: string) {
  return Boolean(
    message && /schema cache|does not exist|could not find the table/i.test(message),
  );
}

export async function listCompanyAnnouncements(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<CompanyAnnouncementListItem[]> {
  const { data, error } = await fromHrms(supabase, "company_announcements")
    .select(
      `
      id,
      status,
      requires_acknowledgement,
      audience_type,
      publish_at,
      expires_at,
      published_at,
      current_version_id,
      updated_at,
      current_version:current_version_id (
        id,
        version_number,
        title,
        short_description,
        category,
        priority,
        icon_key
      )
    `,
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  if (error) {
    if (isMissingAnnouncementTable(error.message)) return [];
    const fallback = await fromHrms(supabase, "company_announcements")
      .select(
        "id, status, requires_acknowledgement, audience_type, publish_at, expires_at, published_at, current_version_id, updated_at",
      )
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false });
    if (fallback.error) {
      if (isMissingAnnouncementTable(fallback.error.message)) return [];
      throw new Error(fallback.error.message);
    }
    const rows = (fallback.data ?? []) as LooseRow[];
    const versionIds = rows.map((row) => asString(row.current_version_id)).filter(Boolean);
    const versions = new Map<string, LooseRow>();
    if (versionIds.length > 0) {
      const { data: versionRows } = await fromHrms(supabase, "company_announcement_versions")
        .select("id, version_number, title, short_description, category, priority, icon_key")
        .in("id", versionIds);
      for (const version of (versionRows ?? []) as LooseRow[]) {
        versions.set(asString(version.id), version);
      }
    }
    return mapAnnouncementListRows(
      rows.map((row) => ({
        ...row,
        current_version: versions.get(asString(row.current_version_id)) ?? null,
      })),
      await loadAckCounts(supabase, rows.map((row) => asString(row.id))),
    );
  }

  const rows = (data ?? []) as LooseRow[];
  return mapAnnouncementListRows(
    rows,
    await loadAckCounts(supabase, rows.map((row) => asString(row.id))),
  );
}

async function loadAckCounts(supabase: AuthSupabaseClient, ids: string[]) {
  const ackCounts = new Map<string, number>();
  if (ids.length === 0) return ackCounts;
  const { data: acks } = await fromHrms(supabase, "company_announcement_acknowledgements")
    .select("announcement_id, version_id")
    .in("announcement_id", ids);
  for (const ack of (acks ?? []) as LooseRow[]) {
    const key = asString(ack.announcement_id);
    ackCounts.set(key, (ackCounts.get(key) ?? 0) + 1);
  }
  return ackCounts;
}

function mapAnnouncementListRows(
  rows: LooseRow[],
  ackCounts: Map<string, number>,
): CompanyAnnouncementListItem[] {
  return rows.map((row) => {
    const version = Array.isArray(row.current_version)
      ? (row.current_version[0] as LooseRow | undefined)
      : (row.current_version as LooseRow | null);
    return {
      id: asString(row.id),
      status: asString(row.status) as CompanyAnnouncementListItem["status"],
      requiresAcknowledgement: Boolean(row.requires_acknowledgement),
      audienceType: asString(row.audience_type) as CompanyAnnouncementListItem["audienceType"],
      publishAt: asStringOrNull(row.publish_at),
      expiresAt: asStringOrNull(row.expires_at),
      publishedAt: asStringOrNull(row.published_at),
      versionId: asStringOrNull(row.current_version_id),
      versionNumber: Number(version?.version_number ?? 1),
      title: asString(version?.title) || "Untitled",
      shortDescription: asStringOrNull(version?.short_description),
      category: (asString(version?.category) || "general") as CompanyAnnouncementListItem["category"],
      priority: (asString(version?.priority) || "normal") as CompanyAnnouncementListItem["priority"],
      iconKey: asIconKey(version?.icon_key),
      acknowledgedCount: ackCounts.get(asString(row.id)) ?? 0,
      audienceCount: 0,
      updatedAt: asString(row.updated_at),
    };
  });
}

export async function getCompanyAnnouncementDetail(
  supabase: AuthSupabaseClient,
  organizationId: string,
  announcementId: string,
): Promise<CompanyAnnouncementDetail | null> {
  const { data, error } = await fromHrms(supabase, "company_announcements")
    .select(
      `
      id,
      status,
      requires_acknowledgement,
      audience_type,
      publish_at,
      expires_at,
      published_at,
      current_version_id,
      updated_at,
      current_version:current_version_id (
        id,
        version_number,
        title,
        short_description,
        content,
        category,
        priority,
        icon_key
      )
    `,
    )
    .eq("organization_id", organizationId)
    .eq("id", announcementId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    const fallback = await fromHrms(supabase, "company_announcements")
      .select(
        "id, status, requires_acknowledgement, audience_type, publish_at, expires_at, published_at, current_version_id, updated_at",
      )
      .eq("organization_id", organizationId)
      .eq("id", announcementId)
      .is("deleted_at", null)
      .maybeSingle();
    if (fallback.error) throw new Error(error.message);
    if (!fallback.data) return null;
    const row = fallback.data as LooseRow;
    const { data: version } = await fromHrms(supabase, "company_announcement_versions")
      .select("id, version_number, title, short_description, content, category, priority, icon_key")
      .eq("id", asString(row.current_version_id))
      .maybeSingle();
    return buildCompanyAnnouncementDetail(supabase, organizationId, announcementId, {
      ...row,
      current_version: version,
    });
  }
  if (!data) return null;

  return buildCompanyAnnouncementDetail(supabase, organizationId, announcementId, data as LooseRow);
}

async function buildCompanyAnnouncementDetail(
  supabase: AuthSupabaseClient,
  organizationId: string,
  announcementId: string,
  row: LooseRow,
): Promise<CompanyAnnouncementDetail | null> {
  const version = Array.isArray(row.current_version)
    ? (row.current_version[0] as LooseRow | undefined)
    : (row.current_version as LooseRow | null);

  const [{ data: targets }, { data: attachmentRows }] = await Promise.all([
    fromHrms(supabase, "company_announcement_targets")
      .select("department_id, employee_id")
      .eq("announcement_id", announcementId),
    fromHrms(supabase, "company_announcement_attachments")
      .select("id, storage_path, file_name, mime_type, file_size")
      .eq("version_id", asString(row.current_version_id)),
  ]);

  const departmentIds = ((targets ?? []) as LooseRow[])
    .map((item) => asStringOrNull(item.department_id))
    .filter((value): value is string => Boolean(value));
  const employeeIds = ((targets ?? []) as LooseRow[])
    .map((item) => asStringOrNull(item.employee_id))
    .filter((value): value is string => Boolean(value));

  const attachments = await mapAttachments(supabase, (attachmentRows ?? []) as LooseRow[]);
  const audienceCount = await countAudienceEmployees(supabase, organizationId, row);
  const { count } = await fromHrms(supabase, "company_announcement_acknowledgements")
    .select("id", { count: "exact", head: true })
    .eq("announcement_id", announcementId)
    .eq("version_id", asString(row.current_version_id));

  return {
    id: asString(row.id),
    status: asString(row.status) as CompanyAnnouncementDetail["status"],
    requiresAcknowledgement: Boolean(row.requires_acknowledgement),
    audienceType: asString(row.audience_type) as CompanyAnnouncementDetail["audienceType"],
    publishAt: asStringOrNull(row.publish_at),
    expiresAt: asStringOrNull(row.expires_at),
    publishedAt: asStringOrNull(row.published_at),
    versionId: asStringOrNull(row.current_version_id),
    versionNumber: Number(version?.version_number ?? 1),
    title: asString(version?.title) || "Untitled",
    shortDescription: asStringOrNull(version?.short_description),
    content: asString(version?.content),
    category: (asString(version?.category) || "general") as CompanyAnnouncementDetail["category"],
    priority: (asString(version?.priority) || "normal") as CompanyAnnouncementDetail["priority"],
    iconKey: asIconKey(version?.icon_key),
    acknowledgedCount: count ?? 0,
    audienceCount,
    updatedAt: asString(row.updated_at),
    departmentIds,
    employeeIds,
    attachments,
  };
}

export async function listAudienceEmployeeRecords(
  supabase: AuthSupabaseClient,
  organizationId: string,
  announcement: {
    audience_type?: unknown;
    id?: unknown;
  },
): Promise<Array<{ id: string; firstName: string; lastName: string; employeeCode: string; departmentId: string | null; departmentName: string | null; email: string | null }>> {
  const audienceType = asString(announcement.audience_type) || "all_employees";
  let employeeIds: string[] | null = null;
  let departmentIds: string[] | null = null;

  if (audienceType !== "all_employees") {
    const { data: targets } = await fromHrms(supabase, "company_announcement_targets")
      .select("department_id, employee_id")
      .eq("announcement_id", asString(announcement.id));
    const rows = (targets ?? []) as LooseRow[];
    if (audienceType === "employees") {
      employeeIds = rows.map((row) => asString(row.employee_id)).filter(Boolean);
    }
    if (audienceType === "department") {
      departmentIds = rows.map((row) => asString(row.department_id)).filter(Boolean);
    }
  }

  let query = fromHrms(supabase, "employees")
    .select("id, first_name, last_name, employee_code, department_id, email, departments:department_id (name)")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .in("employment_status", AUDIENCE_EMPLOYMENT_STATUSES)
    .order("first_name");

  if (employeeIds) {
    if (employeeIds.length === 0) return [];
    query = query.in("id", employeeIds);
  }
  if (departmentIds) {
    if (departmentIds.length === 0) return [];
    query = query.in("department_id", departmentIds);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return ((data ?? []) as LooseRow[]).map((row) => {
    const dept = Array.isArray(row.departments) ? row.departments[0] : row.departments;
    return {
      id: asString(row.id),
      firstName: asString(row.first_name),
      lastName: asString(row.last_name),
      employeeCode: asString(row.employee_code),
      departmentId: asStringOrNull(row.department_id),
      departmentName: asStringOrNull((dept as LooseRow | null)?.name),
      email: asStringOrNull(row.email),
    };
  });
}

async function countAudienceEmployees(
  supabase: AuthSupabaseClient,
  organizationId: string,
  announcement: LooseRow,
) {
  const people = await listAudienceEmployeeRecords(supabase, organizationId, announcement);
  return people.length;
}

export async function getAcknowledgementTracker(
  supabase: AuthSupabaseClient,
  organizationId: string,
  announcementId: string,
): Promise<AcknowledgementTracker | null> {
  const detail = await getCompanyAnnouncementDetail(supabase, organizationId, announcementId);
  if (!detail) return null;

  const audience = await listAudienceEmployeeRecords(supabase, organizationId, {
    id: announcementId,
    audience_type: detail.audienceType,
  });
  const { data: acks } = await fromHrms(supabase, "company_announcement_acknowledgements")
    .select("id, employee_id, acknowledged_at, version_id")
    .eq("announcement_id", announcementId)
    .eq("version_id", detail.versionId);

  const ackByEmployee = new Map(
    ((acks ?? []) as LooseRow[]).map((row) => [asString(row.employee_id), row]),
  );

  const rows: AcknowledgementTrackerRow[] = audience.map((person) => {
    const ack = ackByEmployee.get(person.id);
    return {
      employeeId: person.id,
      employeeName: `${person.firstName} ${person.lastName}`.trim(),
      employeeCode: person.employeeCode,
      departmentName: person.departmentName,
      status: ack ? "acknowledged" : "pending",
      acknowledgedAt: ack ? asStringOrNull(ack.acknowledged_at) : null,
      acknowledgementId: ack ? asStringOrNull(ack.id) : null,
      versionNumber: ack ? detail.versionNumber : null,
    };
  });

  const acknowledged = rows.filter((row) => row.status === "acknowledged").length;
  const total = rows.length;
  return {
    announcementId,
    title: detail.title,
    versionNumber: detail.versionNumber,
    total,
    acknowledged,
    pending: total - acknowledged,
    completionPercent: total === 0 ? 0 : Math.round((acknowledged / total) * 100),
    rows,
  };
}

export async function getAcknowledgementProof(
  supabase: AuthSupabaseClient,
  organizationId: string,
  acknowledgementId: string,
): Promise<AcknowledgementProof | null> {
  const { data, error } = await fromHrms(supabase, "company_announcement_acknowledgements")
    .select(
      `
      employee_name_snapshot,
      employee_email_snapshot,
      employee_code_snapshot,
      acknowledged_at,
      announcement_published_at,
      ip_address,
      company_announcement_versions:version_id (title, version_number)
    `,
    )
    .eq("organization_id", organizationId)
    .eq("id", acknowledgementId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = data as LooseRow;
  const version = Array.isArray(row.company_announcement_versions)
    ? row.company_announcement_versions[0]
    : row.company_announcement_versions;
  const versionRow = (version ?? {}) as LooseRow;
  return {
    announcementTitle: asString(versionRow.title) || "Announcement",
    employeeName: asString(row.employee_name_snapshot),
    employeeCode: asString(row.employee_code_snapshot) || "—",
    employeeEmail: asStringOrNull(row.employee_email_snapshot),
    status: "acknowledged",
    acknowledgedAt: asString(row.acknowledged_at),
    versionLabel: `v${Number(versionRow.version_number ?? 1)}`,
    publishedAt: asStringOrNull(row.announcement_published_at),
    ipAddress: asStringOrNull(row.ip_address),
  };
}

function isDateOnOrBeforeToday(value: string | null) {
  if (!value) return true;
  return value.slice(0, 10) <= new Date().toISOString().slice(0, 10);
}

function isDateOnOrAfterToday(value: string | null) {
  if (!value) return true;
  return value.slice(0, 10) >= new Date().toISOString().slice(0, 10);
}

export async function listEmployeeAnnouncements(
  supabase: AuthSupabaseClient,
  organizationId: string,
  employeeId: string,
  options?: { skipAudienceFilter?: boolean },
): Promise<CompanyAnnouncementEmployeeView[]> {
  const { data, error } = await fromHrms(supabase, "company_announcements")
    .select(
      `
      id,
      audience_type,
      requires_acknowledgement,
      publish_at,
      expires_at,
      published_at,
      current_version_id,
      current_version:current_version_id (
        id,
        version_number,
        title,
        short_description,
        content,
        category,
        priority,
        icon_key
      )
    `,
    )
    .eq("organization_id", organizationId)
    .eq("status", "published")
    .is("deleted_at", null)
    .order("published_at", { ascending: false });

  if (error) {
    const fallback = await fromHrms(supabase, "company_announcements")
      .select(
        "id, audience_type, requires_acknowledgement, publish_at, expires_at, published_at, current_version_id",
      )
      .eq("organization_id", organizationId)
      .eq("status", "published")
      .is("deleted_at", null)
      .order("published_at", { ascending: false });
    if (fallback.error) throw new Error(error.message);
    const baseRows = (fallback.data ?? []) as LooseRow[];
    const versionIds = baseRows.map((row) => asString(row.current_version_id)).filter(Boolean);
    const versions = new Map<string, LooseRow>();
    if (versionIds.length > 0) {
      const { data: versionRows } = await fromHrms(supabase, "company_announcement_versions")
        .select("id, version_number, title, short_description, content, category, priority, icon_key")
        .in("id", versionIds);
      for (const version of (versionRows ?? []) as LooseRow[]) {
        versions.set(asString(version.id), version);
      }
    }
    return mapEmployeeAnnouncementViews(
      supabase,
      organizationId,
      employeeId,
      baseRows.map((row) => ({
        ...row,
        current_version: versions.get(asString(row.current_version_id)) ?? null,
      })),
      options,
    );
  }

  return mapEmployeeAnnouncementViews(
    supabase,
    organizationId,
    employeeId,
    (data ?? []) as LooseRow[],
    options,
  );
}

async function mapEmployeeAnnouncementViews(
  supabase: AuthSupabaseClient,
  organizationId: string,
  employeeId: string,
  rows: LooseRow[],
  options?: { skipAudienceFilter?: boolean },
): Promise<CompanyAnnouncementEmployeeView[]> {
  const announcementIds = rows.map((row) => asString(row.id)).filter(Boolean);
  const versionIds = rows.map((row) => asString(row.current_version_id)).filter(Boolean);

  const [{ data: me }, { data: targets }, { data: acks }, { data: attachmentRows }, { data: org }] =
    await Promise.all([
      fromHrms(supabase, "employees").select("department_id").eq("id", employeeId).maybeSingle(),
      announcementIds.length > 0
        ? fromHrms(supabase, "company_announcement_targets")
            .select("announcement_id, department_id, employee_id")
            .in("announcement_id", announcementIds)
        : Promise.resolve({ data: [] as LooseRow[] }),
      fromHrms(supabase, "company_announcement_acknowledgements")
        .select("announcement_id, version_id, acknowledged_at")
        .eq("employee_id", employeeId)
        .in(
          "version_id",
          versionIds.length > 0 ? versionIds : ["00000000-0000-0000-0000-000000000000"],
        ),
      versionIds.length > 0
        ? fromHrms(supabase, "company_announcement_attachments")
            .select("id, version_id, storage_path, file_name, mime_type, file_size")
            .in("version_id", versionIds)
        : Promise.resolve({ data: [] as LooseRow[] }),
      fromHrms(supabase, "organizations").select("name").eq("id", organizationId).maybeSingle(),
    ]);

  const departmentId = asStringOrNull((me as LooseRow | null)?.department_id);
  const targetsByAnnouncement = new Map<string, LooseRow[]>();
  for (const target of (targets ?? []) as LooseRow[]) {
    const key = asString(target.announcement_id);
    const list = targetsByAnnouncement.get(key) ?? [];
    list.push(target);
    targetsByAnnouncement.set(key, list);
  }

  const ackMap = new Map(
    ((acks ?? []) as LooseRow[]).map((row) => [
      `${asString(row.announcement_id)}:${asString(row.version_id)}`,
      asString(row.acknowledged_at),
    ]),
  );

  const attachmentsByVersion = new Map<string, LooseRow[]>();
  for (const file of (attachmentRows ?? []) as LooseRow[]) {
    const key = asString(file.version_id);
    const list = attachmentsByVersion.get(key) ?? [];
    list.push(file);
    attachmentsByVersion.set(key, list);
  }

  const companyName = asString((org as LooseRow | null)?.name) || "Company";
  const views: CompanyAnnouncementEmployeeView[] = [];

  for (const row of rows) {
    if (!isDateOnOrBeforeToday(asStringOrNull(row.publish_at))) continue;
    if (!isDateOnOrAfterToday(asStringOrNull(row.expires_at))) continue;

    const audienceType = asString(row.audience_type) || "all_employees";
    const targeted = targetsByAnnouncement.get(asString(row.id)) ?? [];
    const isVisible =
      audienceType === "all_employees" ||
      (audienceType === "department" &&
        Boolean(departmentId) &&
        targeted.some((item) => asString(item.department_id) === departmentId)) ||
      (audienceType === "employees" &&
        targeted.some((item) => asString(item.employee_id) === employeeId));
    if (!options?.skipAudienceFilter && !isVisible) continue;

    const version = Array.isArray(row.current_version)
      ? (row.current_version[0] as LooseRow | undefined)
      : (row.current_version as LooseRow | null);
    if (!version) continue;
    const versionId = asString(version.id);
    views.push({
      id: asString(row.id),
      versionId,
      versionNumber: Number(version.version_number ?? 1),
      title: asString(version.title),
      shortDescription: asStringOrNull(version.short_description),
      content: asString(version.content),
      category: (asString(version.category) || "general") as CompanyAnnouncementEmployeeView["category"],
      priority: (asString(version.priority) || "normal") as CompanyAnnouncementEmployeeView["priority"],
      iconKey: asIconKey(version.icon_key),
      publishAt: asStringOrNull(row.publish_at),
      publishedAt: asStringOrNull(row.published_at),
      requiresAcknowledgement: Boolean(row.requires_acknowledgement),
      acknowledgedAt: ackMap.get(`${asString(row.id)}:${versionId}`) ?? null,
      attachments: await mapAttachments(supabase, attachmentsByVersion.get(versionId) ?? []),
      companyName,
    });
  }
  return views;
}

export async function listPendingMandatoryAnnouncements(
  supabase: AuthSupabaseClient,
  organizationId: string,
  employeeId: string,
): Promise<CompanyAnnouncementEmployeeView[]> {
  const items = await listEmployeeAnnouncements(supabase, organizationId, employeeId);
  return items.filter((item) => item.requiresAcknowledgement && !item.acknowledgedAt);
}
