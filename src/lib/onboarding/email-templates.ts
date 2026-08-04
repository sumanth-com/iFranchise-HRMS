import {
  renderBrandedEmail,
  renderDetailTable,
  renderEmailButtons,
  renderNote,
  renderParagraph,
} from "@/lib/email/branding";
import { siteConfig } from "@/config/site";
import { ONBOARDING_INVITATION_TTL_HOURS, ONBOARDING_OTP_TTL_MINUTES } from "@/lib/onboarding/constants";

export type OnboardingInvitationEmailParams = {
  candidateName: string;
  personalEmail: string;
  inviteUrl: string;
  expiryLabel: string;
  joiningDate?: string | null;
  designationName?: string | null;
  departmentName?: string | null;
  workLocationName?: string | null;
  employmentTypeName?: string | null;
  reportingManagerName?: string | null;
};

function formatJoiningDate(value: string | null | undefined) {
  if (!value) return "To be confirmed";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function buildDetailRows(params: OnboardingInvitationEmailParams) {
  const rows = [
    { label: "Candidate email", value: params.personalEmail },
    { label: "Joining date", value: formatJoiningDate(params.joiningDate) },
  ];

  if (params.designationName) rows.push({ label: "Designation", value: params.designationName });
  if (params.departmentName) rows.push({ label: "Department", value: params.departmentName });
  if (params.workLocationName) rows.push({ label: "Work location", value: params.workLocationName });
  if (params.employmentTypeName) rows.push({ label: "Employment type", value: params.employmentTypeName });
  if (params.reportingManagerName) {
    rows.push({ label: "Reporting manager", value: params.reportingManagerName });
  }

  return rows;
}

function renderOnboardingSteps(): string {
  const steps = [
    "Confirm your personal and contact information",
    "Upload identity, education, and employment documents",
    "Review company policies and employment agreements",
    "Complete your electronic signature and submit for HR review",
  ];

  const items = steps
    .map(
      (step) =>
        `<li style="margin:0 0 10px;font-size:14px;line-height:1.65;color:#374151;">${step}</li>`,
    )
    .join("");

  return `<ol style="margin:12px auto 0;padding-left:22px;max-width:480px;list-style-position:outside;">${items}</ol>`;
}

/** Pre-joining invitation — sent to the candidate's personal email. */
export function renderOnboardingInvitationEmail(params: OnboardingInvitationEmailParams): {
  subject: string;
  html: string;
  text: string;
} {
  const firstName = params.candidateName.trim().split(/\s+/)[0] ?? "there";

  const content = `
    ${renderParagraph(`Dear ${firstName},`)}
    ${renderParagraph(
      `Congratulations on your upcoming journey with <strong>${siteConfig.name}</strong>. To help us prepare for your joining, please complete your secure pre-joining onboarding before your start date.`,
    )}
    ${renderDetailTable(buildDetailRows(params))}
  <div style="margin:28px 0 4px;text-align:center;">
    <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#111827;text-transform:uppercase;letter-spacing:0.06em;">
      What you will complete
    </p>
    <div style="display:inline-block;text-align:left;max-width:480px;">
      ${renderOnboardingSteps()}
    </div>
  </div>
    ${renderEmailButtons([
      { label: "Begin secure onboarding", href: params.inviteUrl, variant: "primary" },
    ])}
    ${renderNote(
      `This invitation link is unique to you and expires on <strong>${params.expiryLabel}</strong> (${ONBOARDING_INVITATION_TTL_HOURS} hours from issue). Sign in with this personal email address: <strong>${params.personalEmail}</strong>. Do not forward this email.`,
    )}
    <div style="margin:16px 0 0;text-align:center;">
      <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#64748b;">
        If the button does not work, copy and paste this link into your browser:
      </p>
      <p style="margin:0;font-size:12px;line-height:1.6;">
        <a href="${params.inviteUrl}" style="color:#2563eb;word-break:break-all;">${params.inviteUrl}</a>
      </p>
    </div>
  `;

  const html = renderBrandedEmail({
    title: "Complete your pre-joining onboarding",
    preheader: `Action required — complete onboarding before ${formatJoiningDate(params.joiningDate)}`,
    heading: "Welcome to the team",
    subheading: "Secure pre-joining onboarding invitation",
    contentHtml: content,
    footerNote: `${siteConfig.name} · Confidential onboarding communication`,
  });

  const text = [
    `Dear ${firstName},`,
    "",
    `You have been invited to complete pre-joining onboarding with ${siteConfig.name}.`,
    `Joining date: ${formatJoiningDate(params.joiningDate)}`,
    params.designationName ? `Designation: ${params.designationName}` : "",
    params.departmentName ? `Department: ${params.departmentName}` : "",
    params.workLocationName ? `Work location: ${params.workLocationName}` : "",
    "",
    `Begin onboarding: ${params.inviteUrl}`,
    "",
    `This link expires on ${params.expiryLabel}. Sign in with ${params.personalEmail}.`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    subject: `${siteConfig.name} — Complete your pre-joining onboarding`,
    html,
    text,
  };
}

export type OnboardingAccountReadyEmailParams = {
  candidateName: string;
  companyEmail: string;
  employeeCode: string;
  loginUrl: string;
};

/** Sent to personal email after HR approves and company account is created. */
export function renderOnboardingAccountReadyEmail(params: OnboardingAccountReadyEmailParams): {
  subject: string;
  html: string;
  text: string;
} {
  const firstName = params.candidateName.trim().split(/\s+/)[0] ?? "there";

  const content = `
    ${renderParagraph(`Dear ${firstName},`)}
    ${renderParagraph(
      `Your onboarding has been approved and your official <strong>${siteConfig.name}</strong> employee account is now active.`,
    )}
    ${renderDetailTable([
      { label: "Company email", value: params.companyEmail },
      { label: "Employee ID", value: params.employeeCode },
    ])}
    ${renderParagraph(
      `Sign in to the employee portal with your <strong>company email</strong> and the <strong>same password</strong> you created during pre-joining onboarding.`,
    )}
    ${renderEmailButtons([{ label: "Open employee portal", href: params.loginUrl, variant: "primary" }])}
    ${renderNote(
      "Your temporary pre-joining onboarding portal access has been deactivated. All documents you submitted are now stored in your employee profile.",
    )}
  `;

  const html = renderBrandedEmail({
    title: "Your company account is ready",
    preheader: `Employee ID ${params.employeeCode} — sign in with your company email`,
    heading: "You're officially onboarded",
    subheading: "Company account activation complete",
    contentHtml: content,
    footerNote: `${siteConfig.name} · Employee account notification`,
  });

  const text = [
    `Dear ${firstName},`,
    "",
    "Your company account is ready.",
    `Company email: ${params.companyEmail}`,
    `Employee ID: ${params.employeeCode}`,
    `Login: ${params.loginUrl}`,
    "",
    "Use your company email and the same password you set during onboarding.",
  ].join("\n");

  return {
    subject: `${siteConfig.name} — Your company account is ready`,
    html,
    text,
  };
}

export type OnboardingOtpEmailParams = {
  otp: string;
  personalEmail: string;
};

export function renderOnboardingOtpEmail(params: OnboardingOtpEmailParams): {
  subject: string;
  html: string;
  text: string;
} {
  const content = `
    ${renderParagraph("Use this one-time verification code to access your onboarding portal:")}
    <div style="margin:20px 0;text-align:center;">
      <div style="display:inline-block;border-radius:16px;border:1px solid #e5e7eb;background:#f8fafc;padding:18px 28px;">
        <span style="font-size:32px;font-weight:800;letter-spacing:0.35em;color:#111827;font-family:ui-monospace,Menlo,monospace;">
          ${params.otp}
        </span>
      </div>
    </div>
    ${renderNote(
      `This code expires in ${ONBOARDING_OTP_TTL_MINUTES} minutes and is valid only for <strong>${params.personalEmail}</strong>. Never share this code with anyone.`,
    )}
  `;

  const html = renderBrandedEmail({
    title: "Onboarding verification code",
    preheader: `Your verification code: ${params.otp}`,
    heading: "Verification code",
    subheading: "Secure sign-in to onboarding portal",
    contentHtml: content,
    footerNote: `${siteConfig.name} · Automated security message`,
  });

  return {
    subject: `${siteConfig.name} — Onboarding verification code`,
    html,
    text: `Your onboarding verification code is ${params.otp}. It expires in ${ONBOARDING_OTP_TTL_MINUTES} minutes.`,
  };
}

export type OnboardingCorrectionsEmailParams = {
  candidateName: string;
  personalEmail: string;
  portalLoginUrl: string;
  correctionNotes?: string | null;
};

export function renderOnboardingCorrectionsEmail(params: OnboardingCorrectionsEmailParams): {
  subject: string;
  html: string;
  text: string;
} {
  const firstName = params.candidateName.trim().split(/\s+/)[0] ?? "there";

  const content = `
    ${renderParagraph(`Dear ${firstName},`)}
    ${renderParagraph(
      "Our HR team has reviewed your onboarding submission and needs a few updates before we can proceed.",
    )}
    ${params.correctionNotes ? renderNote(`<strong style="color:#334155;">HR notes:</strong> ${params.correctionNotes}`) : ""}
    ${renderEmailButtons([
      { label: "Return to onboarding portal", href: params.portalLoginUrl, variant: "primary" },
    ])}
    ${renderNote(
      `Sign in with your personal email (<strong>${params.personalEmail}</strong>) to update the requested information and resubmit for review.`,
    )}
  `;

  const html = renderBrandedEmail({
    title: "Onboarding corrections requested",
    preheader: "Action required — update your onboarding submission",
    heading: "Corrections requested",
    subheading: "Please review HR feedback and resubmit",
    contentHtml: content,
    footerNote: `${siteConfig.name} · Onboarding review update`,
  });

  const text = [
    `Dear ${firstName},`,
    "",
    "HR has requested corrections to your onboarding submission.",
    params.correctionNotes ? `Notes: ${params.correctionNotes}` : "",
    "",
    `Sign in: ${params.portalLoginUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    subject: `${siteConfig.name} — Action required on your onboarding`,
    html,
    text,
  };
}
