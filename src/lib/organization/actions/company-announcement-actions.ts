"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { CEO_ROUTES } from "@/lib/ceo/constants";
import { EMPLOYEE_ROUTES } from "@/lib/employee/constants";
import {
  canManageCompanyAnnouncements,
  canViewCompanyAnnouncements,
} from "@/lib/organization/company-announcement-constants";
import { ORGANIZATION_ROUTES } from "@/lib/organization/constants";
import {
  acknowledgeCompanyAnnouncement,
  archiveCompanyAnnouncement,
  deleteCompanyAnnouncement,
  publishCompanyAnnouncement,
  saveCompanyAnnouncement,
} from "@/lib/organization/services/company-announcement-mutations";
import {
  getAcknowledgementProof,
  getAcknowledgementTracker,
  getCompanyAnnouncementDetail,
  listCompanyAnnouncements,
  listEmployeeAnnouncements,
  listPendingMandatoryAnnouncements,
} from "@/lib/organization/services/company-announcement-queries";
import { requireAuthenticatedProfile } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import { companyAnnouncementFormSchema } from "@/lib/validations/company-announcement";
import { ZodError } from "zod";
import type {
  AcknowledgementProof,
  AcknowledgementTracker,
  CompanyAnnouncementDetail,
  CompanyAnnouncementEmployeeView,
  CompanyAnnouncementListItem,
} from "@/types/company-announcement";

type ActionResult<T> = { success: true; data: T } | { success: false; message: string };

function friendlyError(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Please check the announcement details.";
  }
  if (error instanceof Error && error.message && !/supabase|postgres|rpc|sql/i.test(error.message)) {
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

function revalidateAnnouncementSurfaces() {
  revalidatePath(ORGANIZATION_ROUTES.announcements);
  revalidatePath(CEO_ROUTES.organizationAnnouncements);
  revalidatePath(EMPLOYEE_ROUTES.announcements);
}

function revalidateEmployeeAnnouncementsList() {
  revalidatePath(EMPLOYEE_ROUTES.announcements);
}

async function requestContext() {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  const ipAddress = forwarded?.split(",")[0]?.trim() || headerList.get("x-real-ip");
  return {
    ipAddress: ipAddress || null,
    userAgent: headerList.get("user-agent"),
  };
}

export async function listCompanyAnnouncementsAction(): Promise<
  ActionResult<CompanyAnnouncementListItem[]>
> {
  try {
    const profile = await requireAuthenticatedProfile();
    if (!canViewCompanyAnnouncements(profile.permissionCodes)) {
      throw new Error("You do not have permission to view announcements.");
    }
    const supabase = await createClient();
    const data = await listCompanyAnnouncements(supabase, profile.employee.organizationId);
    return { success: true, data };
  } catch (error) {
    return { success: false, message: friendlyError(error) };
  }
}

export async function getCompanyAnnouncementDetailAction(
  announcementId: string,
): Promise<ActionResult<CompanyAnnouncementDetail | null>> {
  try {
    const profile = await requireAuthenticatedProfile();
    if (!canViewCompanyAnnouncements(profile.permissionCodes)) {
      throw new Error("You do not have permission to view announcements.");
    }
    const supabase = await createClient();
    const data = await getCompanyAnnouncementDetail(
      supabase,
      profile.employee.organizationId,
      announcementId,
    );
    return { success: true, data };
  } catch (error) {
    return { success: false, message: friendlyError(error) };
  }
}

export async function saveCompanyAnnouncementAction(
  formData: FormData,
): Promise<ActionResult<string>> {
  try {
    const profile = await requireAuthenticatedProfile();
    if (!canManageCompanyAnnouncements(profile.permissionCodes)) {
      throw new Error("You do not have permission to manage announcements.");
    }
    const idRaw = String(formData.get("id") ?? "").trim();
    const parsed = companyAnnouncementFormSchema.parse({
      id: idRaw || undefined,
      title: String(formData.get("title") ?? ""),
      shortDescription: String(formData.get("shortDescription") ?? ""),
      content: String(formData.get("content") ?? ""),
      category: String(formData.get("category") ?? "general"),
      priority: String(formData.get("priority") ?? "normal"),
      requiresAcknowledgement: formData.get("requiresAcknowledgement") === "true",
      audienceType: String(formData.get("audienceType") ?? "all_employees"),
      iconKey: String(formData.get("iconKey") ?? "megaphone"),
      departmentIds: formData.getAll("departmentIds").map(String).filter(Boolean),
      employeeIds: formData.getAll("employeeIds").map(String).filter(Boolean),
      publishAt: String(formData.get("publishAt") ?? ""),
      expiresAt: String(formData.get("expiresAt") ?? ""),
      publishNow: formData.get("publishNow") === "true",
      removeAttachmentIds: formData.getAll("removeAttachmentIds").map(String).filter(Boolean),
    });
    const files = formData
      .getAll("attachments")
      .filter((item): item is File => item instanceof File && item.size > 0);
    const supabase = await createClient();
    const id = await saveCompanyAnnouncement(supabase, profile, parsed, files);
    revalidateAnnouncementSurfaces();
    return { success: true, data: id };
  } catch (error) {
    return { success: false, message: friendlyError(error) };
  }
}

export async function publishCompanyAnnouncementAction(
  announcementId: string,
): Promise<ActionResult<true>> {
  try {
    const profile = await requireAuthenticatedProfile();
    if (!canManageCompanyAnnouncements(profile.permissionCodes)) {
      throw new Error("You do not have permission to publish announcements.");
    }
    const supabase = await createClient();
    await publishCompanyAnnouncement(supabase, profile, announcementId);
    revalidateAnnouncementSurfaces();
    return { success: true, data: true };
  } catch (error) {
    return { success: false, message: friendlyError(error) };
  }
}

export async function archiveCompanyAnnouncementAction(
  announcementId: string,
): Promise<ActionResult<true>> {
  try {
    const profile = await requireAuthenticatedProfile();
    if (!canManageCompanyAnnouncements(profile.permissionCodes)) {
      throw new Error("You do not have permission to archive announcements.");
    }
    const supabase = await createClient();
    await archiveCompanyAnnouncement(supabase, profile, announcementId);
    revalidateAnnouncementSurfaces();
    return { success: true, data: true };
  } catch (error) {
    return { success: false, message: friendlyError(error) };
  }
}

export async function deleteCompanyAnnouncementAction(
  announcementId: string,
): Promise<ActionResult<true>> {
  try {
    const profile = await requireAuthenticatedProfile();
    if (!canManageCompanyAnnouncements(profile.permissionCodes)) {
      throw new Error("You do not have permission to delete announcements.");
    }
    const supabase = await createClient();
    await deleteCompanyAnnouncement(supabase, profile, announcementId);
    revalidateAnnouncementSurfaces();
    return { success: true, data: true };
  } catch (error) {
    return { success: false, message: friendlyError(error) };
  }
}

export async function getAcknowledgementTrackerAction(
  announcementId: string,
): Promise<ActionResult<AcknowledgementTracker | null>> {
  try {
    const profile = await requireAuthenticatedProfile();
    if (!canViewCompanyAnnouncements(profile.permissionCodes)) {
      throw new Error("You do not have permission to view acknowledgements.");
    }
    const supabase = await createClient();
    const data = await getAcknowledgementTracker(
      supabase,
      profile.employee.organizationId,
      announcementId,
    );
    return { success: true, data };
  } catch (error) {
    return { success: false, message: friendlyError(error) };
  }
}

export async function getAcknowledgementProofAction(
  acknowledgementId: string,
): Promise<ActionResult<AcknowledgementProof | null>> {
  try {
    const profile = await requireAuthenticatedProfile();
    if (!canViewCompanyAnnouncements(profile.permissionCodes)) {
      throw new Error("You do not have permission to view acknowledgement proof.");
    }
    const supabase = await createClient();
    const data = await getAcknowledgementProof(
      supabase,
      profile.employee.organizationId,
      acknowledgementId,
    );
    return { success: true, data };
  } catch (error) {
    return { success: false, message: friendlyError(error) };
  }
}

export async function listEmployeeAnnouncementsAction(): Promise<
  ActionResult<CompanyAnnouncementEmployeeView[]>
> {
  try {
    const profile = await requireAuthenticatedProfile();
    const supabase = await createClient();
    const data = await listEmployeeAnnouncements(
      supabase,
      profile.employee.organizationId,
      profile.employee.id,
    );
    return { success: true, data };
  } catch (error) {
    return { success: false, message: friendlyError(error) };
  }
}

export async function listDashboardNoticesAction(): Promise<
  ActionResult<CompanyAnnouncementEmployeeView[]>
> {
  try {
    const profile = await requireAuthenticatedProfile();
    const supabase = await createClient();
    const data = await listEmployeeAnnouncements(
      supabase,
      profile.employee.organizationId,
      profile.employee.id,
      { skipAudienceFilter: canManageCompanyAnnouncements(profile.permissionCodes) },
    );
    return { success: true, data };
  } catch (error) {
    return { success: false, message: friendlyError(error) };
  }
}

export async function listPendingMandatoryAnnouncementsAction(): Promise<
  ActionResult<CompanyAnnouncementEmployeeView[]>
> {
  try {
    const profile = await requireAuthenticatedProfile();
    const supabase = await createClient();
    const data = await listPendingMandatoryAnnouncements(
      supabase,
      profile.employee.organizationId,
      profile.employee.id,
    );
    return { success: true, data };
  } catch (error) {
    return { success: false, message: friendlyError(error) };
  }
}

export async function acknowledgeCompanyAnnouncementAction(
  announcementId: string,
  versionId: string,
): Promise<ActionResult<true>> {
  try {
    const profile = await requireAuthenticatedProfile();
    const supabase = await createClient();
    const { ipAddress, userAgent } = await requestContext();
    await acknowledgeCompanyAnnouncement(
      supabase,
      profile,
      announcementId,
      versionId,
      ipAddress,
      userAgent,
    );
    revalidateEmployeeAnnouncementsList();
    return { success: true, data: true };
  } catch (error) {
    return { success: false, message: friendlyError(error) };
  }
}
