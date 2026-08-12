import { sendEmail } from "@/lib/email/mailer";
import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { buildOfferEmailHtmlFromMessage } from "@/lib/recruitment/offer-email-content";
import {
  contentTypeForOfferLetterExtension,
  resolveOfferLetterExtension,
} from "@/lib/recruitment/services/offer-letter-storage";

export async function deliverOfferEmailToCandidate(input: {
  to: string;
  subject: string;
  messageText: string;
  fileBytes: Uint8Array;
  attachmentFilename: string;
}): Promise<void> {
  const recipient = input.to.trim().toLowerCase();
  if (!recipient) {
    throw new Error("Candidate email is required to send the offer");
  }

  const ext = resolveOfferLetterExtension(input.attachmentFilename);
  const contentType = contentTypeForOfferLetterExtension(ext);
  const messageText = input.messageText.trim();

  const emailResult = await sendEmail({
    to: recipient,
    subject: input.subject.trim(),
    html: buildOfferEmailHtmlFromMessage(messageText),
    text: messageText,
    attachments: [
      {
        filename: input.attachmentFilename,
        content: input.fileBytes,
        contentType,
      },
    ],
  });

  if (!emailResult.delivered) {
    if (emailResult.skipped) {
      throw new Error(
        emailResult.error ??
          "Offer email could not be sent — SMTP is not configured. Add SMTP_HOST, SMTP_USER, SMTP_PASSWORD, and EMAIL_FROM, then try again.",
      );
    }
    throw new Error(emailResult.error ?? "Failed to deliver offer email. Check SMTP settings.");
  }
}

export async function deliverInterviewInviteEmail(input: {
  to: string;
  subject: string;
  messageText: string;
}): Promise<{ delivered: boolean; error?: string }> {
  const recipient = input.to.trim().toLowerCase();
  if (!recipient) {
    return { delivered: false, error: "Candidate email is required to send the interview invite" };
  }

  const messageText = input.messageText.trim();
  const emailResult = await sendEmail({
    to: recipient,
    subject: input.subject.trim(),
    html: buildOfferEmailHtmlFromMessage(messageText),
    text: messageText,
  });

  if (emailResult.delivered) {
    return { delivered: true };
  }

  return {
    delivered: false,
    error:
      emailResult.error ??
      (emailResult.skipped
        ? "Interview email could not be sent — SMTP is not configured."
        : "Failed to deliver interview email."),
  };
}

export async function loadOfferEmailContext(
  supabase: AuthSupabaseClient,
  organizationId: string,
  candidateId: string,
  jobOpeningId: string,
  reportingManagerId: string | null,
  branchId: string | null,
  departmentId: string | null,
  designationId: string | null,
): Promise<{
  candidateEmail: string;
  candidatePhone: string | null;
  candidateName: string;
  jobTitle: string;
  departmentName: string | null;
  designationName: string | null;
  branchName: string | null;
  managerName: string | null;
}> {
  const { data: candidate, error: candError } = await fromHrms(supabase, "recruitment_candidates")
    .select("first_name, last_name, email, phone")
    .eq("id", candidateId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (candError) throw new Error(candError.message);
  if (!candidate?.email) throw new Error("Candidate email not found");

  const { data: job } = await fromHrms(supabase, "recruitment_job_openings")
    .select("title, department_id, designation_id")
    .eq("id", jobOpeningId)
    .maybeSingle();

  let departmentName: string | null = null;
  let designationName: string | null = null;

  const deptId = departmentId ?? job?.department_id;
  const desigId = designationId ?? job?.designation_id;

  if (deptId) {
    const { data } = await supabase
      .schema("hrms")
      .from("departments")
      .select("name")
      .eq("id", deptId)
      .maybeSingle();
    departmentName = data?.name ?? null;
  }

  if (desigId) {
    const { data } = await supabase
      .schema("hrms")
      .from("designations")
      .select("title")
      .eq("id", desigId)
      .maybeSingle();
    designationName = data?.title ?? null;
  }

  let branchName: string | null = null;
  if (branchId) {
    const { data: branch } = await supabase
      .schema("hrms")
      .from("branches")
      .select("name")
      .eq("id", branchId)
      .maybeSingle();
    branchName = branch?.name ?? null;
  }

  let managerName: string | null = null;
  if (reportingManagerId) {
    const { data: manager } = await supabase
      .schema("hrms")
      .from("employees")
      .select("first_name, last_name")
      .eq("id", reportingManagerId)
      .maybeSingle();
    if (manager) {
      managerName = [manager.first_name, manager.last_name].filter(Boolean).join(" ");
    }
  }

  return {
    candidateEmail: candidate.email,
    candidatePhone: candidate.phone,
    candidateName: [candidate.first_name, candidate.last_name].filter(Boolean).join(" "),
    jobTitle: job?.title ?? "Role",
    departmentName,
    designationName,
    branchName,
    managerName,
  };
}

function fromHrms(supabase: AuthSupabaseClient, table: string) {
  return supabase.schema("hrms").from(table);
}
