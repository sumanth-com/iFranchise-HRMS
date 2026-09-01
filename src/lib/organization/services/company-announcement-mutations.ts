import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import {
  COMPANY_ANNOUNCEMENT_BUCKET,
  COMPANY_ANNOUNCEMENT_MAX_BYTES,
  companyAnnouncementStorageFolder,
  isAllowedAnnouncementFile,
} from "@/lib/organization/company-announcement-constants";
import { fromHrms } from "@/lib/reports/services/reports-utils";
import type { UserProfile } from "@/types/auth";
import type { CompanyAnnouncementFormInput } from "@/lib/validations/company-announcement";

type LooseRow = Record<string, unknown>;

function emptyToNull(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

async function replaceTargets(
  supabase: AuthSupabaseClient,
  organizationId: string,
  announcementId: string,
  input: CompanyAnnouncementFormInput,
) {
  await fromHrms(supabase, "company_announcement_targets")
    .delete()
    .eq("announcement_id", announcementId);

  const rows: Array<Record<string, unknown>> = [];
  if (input.audienceType === "department") {
    for (const departmentId of input.departmentIds) {
      rows.push({
        organization_id: organizationId,
        announcement_id: announcementId,
        department_id: departmentId,
      });
    }
  }
  if (input.audienceType === "employees") {
    for (const employeeId of input.employeeIds) {
      rows.push({
        organization_id: organizationId,
        announcement_id: announcementId,
        employee_id: employeeId,
      });
    }
  }
  if (rows.length > 0) {
    const { error } = await fromHrms(supabase, "company_announcement_targets").insert(rows);
    if (error) throw new Error(error.message);
  }
}

async function uploadAttachments(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  announcementId: string,
  versionId: string,
  files: File[],
) {
  const organizationId = profile.employee.organizationId;
  const folder = companyAnnouncementStorageFolder(organizationId, announcementId);
  const rows: Array<Record<string, unknown>> = [];

  for (const file of files) {
    if (!isAllowedAnnouncementFile(file)) {
      throw new Error(`Unsupported file type: ${file.name}`);
    }
    if (file.size > COMPANY_ANNOUNCEMENT_MAX_BYTES) {
      throw new Error(`${file.name} exceeds the 10 MB limit.`);
    }
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${folder}/${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await supabase.storage
      .from(COMPANY_ANNOUNCEMENT_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) throw new Error(uploadError.message);
    rows.push({
      organization_id: organizationId,
      announcement_id: announcementId,
      version_id: versionId,
      storage_path: path,
      file_name: file.name,
      mime_type: file.type,
      file_size: file.size,
      created_by: profile.userId,
    });
  }

  if (rows.length > 0) {
    const { error } = await fromHrms(supabase, "company_announcement_attachments").insert(rows);
    if (error) throw new Error(error.message);
  }
}

async function copyAttachmentsToVersion(
  supabase: AuthSupabaseClient,
  organizationId: string,
  announcementId: string,
  fromVersionId: string,
  toVersionId: string,
  userId: string,
  excludeIds: string[],
) {
  const { data } = await fromHrms(supabase, "company_announcement_attachments")
    .select("id, storage_path, file_name, mime_type, file_size")
    .eq("version_id", fromVersionId);
  const excluded = new Set(excludeIds);
  const rows = ((data ?? []) as LooseRow[])
    .filter((row) => !excluded.has(String(row.id ?? "")))
    .map((row) => ({
      organization_id: organizationId,
      announcement_id: announcementId,
      version_id: toVersionId,
      storage_path: row.storage_path,
      file_name: row.file_name,
      mime_type: row.mime_type,
      file_size: row.file_size,
      created_by: userId,
    }));
  if (rows.length > 0) {
    const { error } = await fromHrms(supabase, "company_announcement_attachments").insert(rows);
    if (error) throw new Error(error.message);
  }
}

async function deleteAnnouncementAttachments(
  supabase: AuthSupabaseClient,
  organizationId: string,
  attachmentIds: string[],
) {
  if (attachmentIds.length === 0) return;
  const { error } = await fromHrms(supabase, "company_announcement_attachments")
    .delete()
    .eq("organization_id", organizationId)
    .in("id", attachmentIds);
  if (error) throw new Error(error.message);
}

export async function saveCompanyAnnouncement(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: CompanyAnnouncementFormInput,
  files: File[],
): Promise<string> {
  const organizationId = profile.employee.organizationId;
  const now = new Date().toISOString();
  const publishNow = Boolean(input.publishNow);

  const versionPayload = {
    organization_id: organizationId,
    title: input.title.trim(),
    short_description: emptyToNull(input.shortDescription),
    content: input.content.trim(),
    category: input.category,
    priority: input.priority,
    icon_key: input.iconKey ?? "megaphone",
    created_by: profile.userId,
  };

  if (!input.id) {
    const announcementId = crypto.randomUUID();
    const versionId = crypto.randomUUID();
    const { error: announcementError } = await fromHrms(supabase, "company_announcements").insert({
      id: announcementId,
      organization_id: organizationId,
      status: publishNow ? "published" : "draft",
      requires_acknowledgement: input.requiresAcknowledgement,
      audience_type: input.audienceType,
      publish_at: input.publishAt,
      expires_at: emptyToNull(input.expiresAt),
      published_at: publishNow ? now : null,
      created_by: profile.userId,
      updated_by: profile.userId,
    });
    if (announcementError) throw new Error(announcementError.message);

    const { error: versionError } = await fromHrms(supabase, "company_announcement_versions").insert({
      id: versionId,
      announcement_id: announcementId,
      version_number: 1,
      ...versionPayload,
    });
    if (versionError) throw new Error(versionError.message);

    const { error: linkError } = await fromHrms(supabase, "company_announcements")
      .update({ current_version_id: versionId, updated_by: profile.userId })
      .eq("id", announcementId);
    if (linkError) throw new Error(linkError.message);

    await replaceTargets(supabase, organizationId, announcementId, input);
    await uploadAttachments(supabase, profile, announcementId, versionId, files);
    return announcementId;
  }

  const { data: existing, error: existingError } = await fromHrms(supabase, "company_announcements")
    .select("id, status, current_version_id")
    .eq("id", input.id)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);
  if (!existing) throw new Error("Announcement not found.");

  const current = existing as LooseRow;
  const wasPublished = current.status === "published";
  const currentVersionId = typeof current.current_version_id === "string" ? current.current_version_id : null;

  const headerUpdate: Record<string, unknown> = {
    requires_acknowledgement: input.requiresAcknowledgement,
    audience_type: input.audienceType,
    publish_at: input.publishAt,
    expires_at: emptyToNull(input.expiresAt),
    status: publishNow || wasPublished ? "published" : current.status,
    updated_by: profile.userId,
  };
  if (publishNow && !wasPublished) {
    headerUpdate.published_at = now;
  }

  const { error: headerError } = await fromHrms(supabase, "company_announcements")
    .update(headerUpdate)
    .eq("id", input.id);
  if (headerError) throw new Error(headerError.message);

  await replaceTargets(supabase, organizationId, input.id, input);

  if (wasPublished && currentVersionId) {
    const { data: versionRow } = await fromHrms(supabase, "company_announcement_versions")
      .select("version_number")
      .eq("announcement_id", input.id)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextNumber = Number((versionRow as LooseRow | null)?.version_number ?? 1) + 1;
    const versionId = crypto.randomUUID();
    const { error: versionError } = await fromHrms(supabase, "company_announcement_versions").insert({
      id: versionId,
      announcement_id: input.id,
      version_number: nextNumber,
      ...versionPayload,
    });
    if (versionError) throw new Error(versionError.message);
    const { error: linkError } = await fromHrms(supabase, "company_announcements")
      .update({ current_version_id: versionId, updated_by: profile.userId })
      .eq("id", input.id);
    if (linkError) throw new Error(linkError.message);
    await copyAttachmentsToVersion(
      supabase,
      organizationId,
      input.id,
      currentVersionId,
      versionId,
      profile.userId,
      input.removeAttachmentIds ?? [],
    );
    await uploadAttachments(supabase, profile, input.id, versionId, files);
    return input.id;
  }

  if (currentVersionId) {
    const { error: versionError } = await fromHrms(supabase, "company_announcement_versions")
      .update(versionPayload)
      .eq("id", currentVersionId);
    if (versionError) throw new Error(versionError.message);
    await deleteAnnouncementAttachments(supabase, organizationId, input.removeAttachmentIds ?? []);
    await uploadAttachments(supabase, profile, input.id, currentVersionId, files);
  }

  return input.id;
}

export async function publishCompanyAnnouncement(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  announcementId: string,
) {
  const { error } = await fromHrms(supabase, "company_announcements")
    .update({
      status: "published",
      published_at: new Date().toISOString(),
      updated_by: profile.userId,
    })
    .eq("id", announcementId)
    .eq("organization_id", profile.employee.organizationId)
    .is("deleted_at", null);
  if (error) throw new Error(error.message);
}

export async function archiveCompanyAnnouncement(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  announcementId: string,
) {
  const { error } = await fromHrms(supabase, "company_announcements")
    .update({
      status: "archived",
      archived_at: new Date().toISOString(),
      updated_by: profile.userId,
    })
    .eq("id", announcementId)
    .eq("organization_id", profile.employee.organizationId)
    .is("deleted_at", null);
  if (error) throw new Error(error.message);
}

export async function deleteCompanyAnnouncement(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  announcementId: string,
) {
  const { count } = await fromHrms(supabase, "company_announcement_acknowledgements")
    .select("id", { count: "exact", head: true })
    .eq("announcement_id", announcementId);
  if ((count ?? 0) > 0) {
    throw new Error("This announcement has acknowledgement records. Archive it instead of deleting.");
  }
  const { error } = await fromHrms(supabase, "company_announcements")
    .update({
      deleted_at: new Date().toISOString(),
      updated_by: profile.userId,
    })
    .eq("id", announcementId)
    .eq("organization_id", profile.employee.organizationId);
  if (error) throw new Error(error.message);
}

export async function acknowledgeCompanyAnnouncement(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  announcementId: string,
  versionId: string,
  ipAddress: string | null,
  userAgent: string | null,
) {
  const employee = profile.employee;
  const { data: existing } = await fromHrms(supabase, "company_announcement_acknowledgements")
    .select("id")
    .eq("announcement_id", announcementId)
    .eq("version_id", versionId)
    .eq("employee_id", employee.id)
    .maybeSingle();
  if (existing) return asStringId(existing);

  const { data: announcement } = await fromHrms(supabase, "company_announcements")
    .select("published_at, current_version_id, requires_acknowledgement, status")
    .eq("id", announcementId)
    .maybeSingle();
  const row = announcement as LooseRow | null;
  if (!row || row.status !== "published") {
    throw new Error("This announcement is no longer available.");
  }
  if (row.current_version_id !== versionId) {
    throw new Error("This announcement was updated. Please review the latest version.");
  }
  if (!row.requires_acknowledgement) {
    throw new Error("This announcement does not require acknowledgement.");
  }

  const { data: inserted, error } = await fromHrms(supabase, "company_announcement_acknowledgements")
    .insert({
      organization_id: employee.organizationId,
      announcement_id: announcementId,
      version_id: versionId,
      employee_id: employee.id,
      user_id: profile.userId,
      employee_name_snapshot: `${employee.firstName} ${employee.lastName}`.trim(),
      employee_email_snapshot: employee.email ?? null,
      employee_code_snapshot: employee.employeeCode ?? null,
      announcement_published_at: row.published_at ?? null,
      ip_address: ipAddress,
      user_agent: userAgent,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    if (/duplicate|unique/i.test(error.message)) {
      return announcementId;
    }
    throw new Error(error.message);
  }
  return asStringId(inserted);
}

function asStringId(value: unknown) {
  if (value && typeof value === "object" && "id" in value) {
    return String((value as { id: unknown }).id);
  }
  return "";
}
