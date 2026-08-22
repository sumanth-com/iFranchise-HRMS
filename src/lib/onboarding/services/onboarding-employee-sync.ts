import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { UserProfile } from "@/types/auth";
import { DOCUMENTS_STORAGE_BUCKET } from "@/lib/documents/constants";
import { getDocumentSettings, nextDocumentNumber } from "@/lib/documents/services/document-settings";
import { getDocumentTypeIdByCode } from "@/lib/documents/services/document-queries";
import { ONBOARDING_STORAGE_BUCKET } from "@/lib/onboarding/constants";
import {
  educationDocumentLabel,
  parseEducationForm,
} from "@/lib/onboarding/education-utils";
import { employmentDocumentLabel } from "@/lib/onboarding/employment-utils";
import type { OnboardingCaseDetail } from "@/types/onboarding";
import {
  ONBOARDING_EMPLOYMENT_DOCUMENTS,
  ONBOARDING_IDENTITY_DOCUMENTS,
} from "@/types/onboarding";
import { createAdminClient } from "@/lib/supabase/admin";

const ONBOARDING_DOC_TYPE_MAP: Record<string, string> = {
  aadhaar: "AADHAAR",
  pan: "PAN",
  passport: "PASSPORT",
  driving_license: "DRIVING_LICENSE",
  resume: "RESUME",
  experience_letter: "EXPERIENCE_LETTER",
  relieving_letter: "RELIEVING_LETTER",
  salary_slip: "OTHER",
  cancelled_cheque: "OTHER",
};

type OnboardingDocumentRow = {
  id: string;
  document_type_code: string;
  file_name: string;
  mime_type: string;
  file_size: number | null;
  storage_path: string;
  review_status: string;
  hr_comment: string | null;
};

function sectionData(detail: OnboardingCaseDetail, key: string): Record<string, unknown> {
  return detail.sections.find((s) => s.sectionKey === key)?.data ?? {};
}

function onboardingDocTitle(code: string): string {
  const catalog = [...ONBOARDING_IDENTITY_DOCUMENTS, ...ONBOARDING_EMPLOYMENT_DOCUMENTS];
  const match = catalog.find((item) => item.code === code);
  if (match) return match.label;
  if (code === "cancelled_cheque") return "Cancelled Cheque";
  if (code.startsWith("edu_")) return educationDocumentLabel(code);
  if (code.startsWith("emp_")) return employmentDocumentLabel(code);
  return code.replace(/_/g, " ");
}

function mapReviewStatus(reviewStatus: string): "pending" | "verified" | "rejected" {
  if (reviewStatus === "approved") return "verified";
  if (reviewStatus === "rejected") return "rejected";
  return "pending";
}

async function resolveDocumentTypeId(
  supabase: AuthSupabaseClient,
  organizationId: string,
  onboardingCode: string,
): Promise<string> {
  const mappedCode = ONBOARDING_DOC_TYPE_MAP[onboardingCode] ?? "OTHER";
  const typeId = await getDocumentTypeIdByCode(supabase, organizationId, mappedCode);
  if (typeId) return typeId;

  const fallback = await getDocumentTypeIdByCode(supabase, organizationId, "OTHER");
  if (!fallback) throw new Error("Document type catalogue is not configured for this organization");
  return fallback;
}

function buildEducationBio(education: Record<string, unknown>): string | null {
  const form = parseEducationForm(education);
  const lines: string[] = [];

  if (form.ssc.schoolName.trim()) {
    lines.push(
      `10th (SSC): ${form.ssc.schoolName.trim()} — ${form.ssc.board || "Board N/A"} (${form.ssc.periodFrom || "?"} to ${form.ssc.periodTo || "?"})`,
    );
  }
  if (form.intermediate.schoolName.trim()) {
    lines.push(
      `12th: ${form.intermediate.schoolName.trim()} — ${form.intermediate.qualification || "Qualification N/A"}, ${form.intermediate.stream || "Stream N/A"} (${form.intermediate.periodFrom || "?"} to ${form.intermediate.periodTo || "?"})`,
    );
  }
  if (form.graduation.collegeName.trim()) {
    lines.push(
      `Graduation: ${form.graduation.degree || "Degree N/A"} (${form.graduation.specialization || "Branch N/A"}) — ${form.graduation.collegeName.trim()}, ${form.graduation.university || "University N/A"} (${form.graduation.periodFrom || "?"} to ${form.graduation.periodTo || "?"})`,
    );
  }

  if (!lines.length) return null;
  return `Education (from onboarding)\n${lines.join("\n")}`;
}

function parseEmergencyContact(raw: string | undefined, fallbackPhone: string | null) {
  if (!raw?.trim()) {
    if (!fallbackPhone) return null;
    return { name: "Emergency contact", relationship: "Emergency", phone: fallbackPhone };
  }

  const trimmed = raw.trim();
  const phoneMatch = trimmed.match(/(\+?\d[\d\s-]{8,}\d)/);
  const phone = phoneMatch?.[1]?.replace(/\s+/g, "") ?? fallbackPhone;
  const name = phoneMatch
    ? trimmed.replace(phoneMatch[0], "").replace(/[-–—,]/g, "").trim()
    : trimmed;

  if (!name || !phone) return null;
  return {
    name,
    relationship: "Emergency",
    phone,
  };
}

async function syncProfileSections(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  employeeId: string,
  detail: OnboardingCaseDetail,
) {
  const admin = createAdminClient();
  const personal = sectionData(detail, "personal");
  const education = sectionData(detail, "education");
  const identity = sectionData(detail, "identity");
  const tax = sectionData(detail, "tax");
  const bank = sectionData(detail, "bank");

  const educationBio = buildEducationBio(education);
  const identityNotes = [
    typeof identity.aadhaar === "string" && identity.aadhaar.trim()
      ? `Aadhaar: ${identity.aadhaar.trim()}`
      : null,
    typeof identity.pan === "string" && identity.pan.trim() ? `PAN: ${identity.pan.trim()}` : null,
    typeof tax.taxPan === "string" && tax.taxPan.trim() ? `Tax PAN: ${tax.taxPan.trim()}` : null,
    typeof tax.taxAadhaar === "string" && tax.taxAadhaar.trim()
      ? `Tax Aadhaar: ${tax.taxAadhaar.trim()}`
      : null,
    typeof tax.taxDeclaration === "string" && tax.taxDeclaration.trim()
      ? `Tax declaration: ${tax.taxDeclaration.trim()}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const bio = [educationBio, identityNotes].filter(Boolean).join("\n\n") || null;

  await admin.schema("hrms").from("employee_profiles").upsert(
    {
      employee_id: employeeId,
      date_of_birth: (personal.dateOfBirth as string) ?? null,
      gender: (personal.gender as string) ?? null,
      marital_status: (personal.maritalStatus as string) ?? null,
      blood_group: (personal.bloodGroup as string) ?? null,
      nationality: (personal.nationality as string) ?? null,
      personal_email: detail.personalEmail,
      personal_phone:
        (personal.personalMobile as string) ?? detail.mobileNumber ?? null,
      bio,
      updated_by: profile.userId,
    },
    { onConflict: "employee_id" },
  );

  const addressLine =
    typeof personal.addressLine === "string"
      ? personal.addressLine.trim()
      : typeof personal.address === "string"
        ? personal.address.trim()
        : "";
  const state =
    typeof personal.state === "string" ? personal.state.trim() : "";
  const city = typeof personal.city === "string" ? personal.city.trim() : "";
  const pincode =
    typeof personal.pincode === "string" ? personal.pincode.trim() : "";

  if (state || city || pincode || addressLine) {
    const { data: existingAddress } = await admin
      .schema("hrms")
      .from("employee_addresses")
      .select("id")
      .eq("employee_id", employeeId)
      .eq("address_type", "current")
      .is("deleted_at", null)
      .maybeSingle();

    const addressPayload = {
      address_line1: addressLine || null,
      address_line2: null,
      city: city || "Not specified",
      state: state || null,
      postal_code: pincode || null,
      country: "India",
      is_primary: true,
      status: "active",
      updated_by: profile.userId,
    };

    if (existingAddress?.id) {
      await admin
        .schema("hrms")
        .from("employee_addresses")
        .update(addressPayload)
        .eq("id", existingAddress.id);
    } else {
      await admin.schema("hrms").from("employee_addresses").insert({
        employee_id: employeeId,
        address_type: "current",
        ...addressPayload,
        created_by: profile.userId,
      });
    }
  }

  const emergency = parseEmergencyContact(
    typeof personal.emergencyContact === "string" ? personal.emergencyContact : undefined,
    (personal.personalMobile as string) ?? detail.mobileNumber ?? null,
  );

  if (emergency) {
    const { data: existingContact } = await admin
      .schema("hrms")
      .from("emergency_contacts")
      .select("id")
      .eq("employee_id", employeeId)
      .eq("is_primary", true)
      .is("deleted_at", null)
      .maybeSingle();

    const contactPayload = {
      name: emergency.name,
      relationship: emergency.relationship,
      phone: emergency.phone,
      is_primary: true,
      status: "active",
      updated_by: profile.userId,
    };

    if (existingContact?.id) {
      await admin
        .schema("hrms")
        .from("emergency_contacts")
        .update(contactPayload)
        .eq("id", existingContact.id);
    } else {
      await admin.schema("hrms").from("emergency_contacts").insert({
        employee_id: employeeId,
        ...contactPayload,
        created_by: profile.userId,
      });
    }
  }

  const bankName = typeof bank.bankName === "string" ? bank.bankName.trim() : "";
  const accountNumber = typeof bank.accountNumber === "string" ? bank.accountNumber.trim() : "";
  const ifsc = typeof bank.ifsc === "string" ? bank.ifsc.trim() : "";

  if (bankName && accountNumber) {
    const { data: existingBank } = await admin
      .schema("hrms")
      .from("bank_accounts")
      .select("id")
      .eq("employee_id", employeeId)
      .eq("is_primary", true)
      .is("deleted_at", null)
      .maybeSingle();

    const bankPayload = {
      bank_name: bankName,
      account_holder_name: detail.fullName,
      account_number: accountNumber,
      ifsc_code: ifsc || null,
      account_type: "salary",
      is_primary: true,
      status: "active",
      updated_by: profile.userId,
    };

    if (existingBank?.id) {
      await admin.schema("hrms").from("bank_accounts").update(bankPayload).eq("id", existingBank.id);
    } else {
      await admin.schema("hrms").from("bank_accounts").insert({
        employee_id: employeeId,
        ...bankPayload,
        created_by: profile.userId,
      });
    }
  }
}

async function copyOnboardingFile(
  admin: ReturnType<typeof createAdminClient>,
  organizationId: string,
  employeeId: string,
  sourcePath: string,
  fileName: string,
  mimeType: string,
): Promise<{ storagePath: string; fileSize: number } | null> {
  const { data: blob, error: downloadError } = await admin.storage
    .from(ONBOARDING_STORAGE_BUCKET)
    .download(sourcePath);

  if (downloadError || !blob) return null;

  const bytes = new Uint8Array(await blob.arrayBuffer());
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${organizationId}/${employeeId}/${crypto.randomUUID()}-${sanitizedName}`;

  const { error: uploadError } = await admin.storage
    .from(DOCUMENTS_STORAGE_BUCKET)
    .upload(storagePath, bytes, {
      contentType: mimeType || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) return null;
  return { storagePath, fileSize: bytes.byteLength };
}

async function syncOnboardingDocuments(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  caseId: string,
  employeeId: string,
  organizationId: string,
) {
  const admin = createAdminClient();
  const settings = await getDocumentSettings(supabase, organizationId);

  const { data: rows, error } = await admin
    .schema("hrms")
    .from("onboarding_documents")
    .select(
      "id, document_type_code, file_name, mime_type, file_size, storage_path, review_status, hr_comment",
    )
    .eq("case_id", caseId)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);

  for (const row of (rows ?? []) as OnboardingDocumentRow[]) {
    const copied = await copyOnboardingFile(
      admin,
      organizationId,
      employeeId,
      row.storage_path,
      row.file_name,
      row.mime_type,
    );
    if (!copied) continue;

    const documentTypeId = await resolveDocumentTypeId(
      supabase,
      organizationId,
      row.document_type_code,
    );
    const documentNumber = await nextDocumentNumber(
      supabase,
      organizationId,
      settings.documentNumberPrefix,
    );
    const documentStatus = mapReviewStatus(row.review_status);
    const verifiedAt = documentStatus === "verified" ? new Date().toISOString() : null;

    await admin.schema("hrms").from("employee_documents").insert({
      organization_id: organizationId,
      employee_id: employeeId,
      document_type_id: documentTypeId,
      title: onboardingDocTitle(row.document_type_code),
      document_number: documentNumber,
      storage_path: copied.storagePath,
      file_name: row.file_name,
      mime_type: row.mime_type || "application/octet-stream",
      file_size_bytes: copied.fileSize,
      document_status: documentStatus,
      source: "upload",
      is_official: false,
      notes: row.hr_comment
        ? `Imported from onboarding. HR note: ${row.hr_comment}`
        : "Imported from onboarding",
      verified_at: verifiedAt,
      verified_by: verifiedAt ? profile.userId : null,
      status: "active",
      created_by: profile.userId,
      updated_by: profile.userId,
    });
  }
}

async function syncOnboardingSignature(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  caseId: string,
  employeeId: string,
  organizationId: string,
  detail: OnboardingCaseDetail,
) {
  if (!detail.signature) return;

  const admin = createAdminClient();
  const { data: signatureRow, error } = await admin
    .schema("hrms")
    .from("onboarding_signatures")
    .select("signature_type, signature_data")
    .eq("case_id", caseId)
    .order("finalized_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !signatureRow?.signature_data) return;

  const settings = await getDocumentSettings(supabase, organizationId);
  const documentTypeId = await resolveDocumentTypeId(supabase, organizationId, "signature");
  const documentNumber = await nextDocumentNumber(
    supabase,
    organizationId,
    settings.documentNumberPrefix,
  );

  let bytes: Uint8Array;
  let fileName = "onboarding-signature";
  let mimeType = "application/octet-stream";

  const signatureData = signatureRow.signature_data as string;
  if (
    signatureRow.signature_type === "drawn" ||
    signatureRow.signature_type === "uploaded" ||
    signatureData.startsWith("data:")
  ) {
    const base64 = signatureData.includes(",") ? signatureData.split(",")[1] : signatureData;
    bytes = Uint8Array.from(Buffer.from(base64, "base64"));
    mimeType = signatureData.startsWith("data:image/png")
      ? "image/png"
      : signatureData.startsWith("data:image/jpeg")
        ? "image/jpeg"
        : "image/png";
    fileName = `onboarding-signature.${mimeType === "image/jpeg" ? "jpg" : "png"}`;
  } else {
    const text = `Onboarding e-signature (${signatureRow.signature_type}): ${signatureData}`;
    bytes = new TextEncoder().encode(text);
    mimeType = "text/plain";
    fileName = "onboarding-signature.txt";
  }

  const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${organizationId}/${employeeId}/${crypto.randomUUID()}-${sanitizedName}`;
  const { error: uploadError } = await admin.storage
    .from(DOCUMENTS_STORAGE_BUCKET)
    .upload(storagePath, bytes, { contentType: mimeType, upsert: false });

  if (uploadError) return;

  await admin.schema("hrms").from("employee_documents").insert({
    organization_id: organizationId,
    employee_id: employeeId,
    document_type_id: documentTypeId,
    title: "Onboarding E-Signature",
    document_number: documentNumber,
    storage_path: storagePath,
    file_name: fileName,
    mime_type: mimeType,
    file_size_bytes: bytes.byteLength,
    document_status: "verified",
    source: "upload",
    is_official: false,
    notes: "Imported from onboarding e-signature",
    verified_at: new Date().toISOString(),
    verified_by: profile.userId,
    status: "active",
    created_by: profile.userId,
    updated_by: profile.userId,
  });
}

export async function syncOnboardingDataToEmployee(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  caseId: string,
  employeeId: string,
  detail: OnboardingCaseDetail,
): Promise<void> {
  const organizationId = profile.employee.organizationId;

  await syncProfileSections(supabase, profile, employeeId, detail);
  await syncOnboardingDocuments(supabase, profile, caseId, employeeId, organizationId);
  await syncOnboardingSignature(supabase, profile, caseId, employeeId, organizationId, detail);
}
