const HR_EMAIL = "hr@ifranchise.in";
const HR_PHONE = "+91-9247 536532";

export const DEFAULT_OFFER_EMAIL_MESSAGE_TEMPLATE = [
  "Dear {{candidateName}},",
  "",
  "We are pleased to extend an offer of employment for the position of {{position}} at iFranchise.",
  "",
  "Please find attached your offer letter with details of your compensation and joining arrangements. We kindly request that you review the document carefully and reach out if you have any questions.",
  "",
  "For assistance, contact our HR team at {{hrEmail}} or {{hrPhone}}.",
  "",
  "We look forward to welcoming you to iFranchise.",
  "",
  "Warm regards,",
  "Human Resources",
  "iFranchise",
].join("\n");

export const DEFAULT_OFFER_EMAIL_SUBJECT_TEMPLATE = "Offer of Employment — {{position}} | iFranchise";

export type OfferEmailTemplateVariables = {
  candidateName: string;
  position: string;
  hrEmail?: string;
  hrPhone?: string;
};

export function applyOfferEmailTemplate(
  template: string,
  variables: OfferEmailTemplateVariables,
): string {
  const hrEmail = variables.hrEmail ?? HR_EMAIL;
  const hrPhone = variables.hrPhone ?? HR_PHONE;

  return template
    .replaceAll("{{candidateName}}", variables.candidateName)
    .replaceAll("{{position}}", variables.position)
    .replaceAll("{{hrEmail}}", hrEmail)
    .replaceAll("{{hrPhone}}", hrPhone);
}

export function buildDefaultOfferEmailMessage(
  candidateName: string,
  position: string,
  hrEmail?: string,
  hrPhone?: string,
): string {
  return applyOfferEmailTemplate(DEFAULT_OFFER_EMAIL_MESSAGE_TEMPLATE, {
    candidateName,
    position,
    hrEmail,
    hrPhone,
  });
}

export function buildDefaultOfferEmailSubject(position: string, subjectTemplate?: string): string {
  return applyOfferEmailTemplate(subjectTemplate ?? DEFAULT_OFFER_EMAIL_SUBJECT_TEMPLATE, {
    candidateName: "",
    position,
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildOfferEmailHtmlFromMessage(message: string): string {
  const paragraphs = message
    .split(/\n\n+/)
    .filter((block) => block.trim().length > 0)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br>")}</p>`)
    .join("");

  return `
    <div style="font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 1.6; color: #1a1a1a;">
      ${paragraphs}
    </div>
  `.trim();
}
