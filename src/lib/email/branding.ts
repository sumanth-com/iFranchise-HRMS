import { EMAIL_BRAND_LOGO_PATH } from "@/lib/brand/constants";
import { siteConfig } from "@/config/site";

const COLORS = {
  headerFrom: "#111827",
  headerTo: "#334155",
  ink: "#111827",
  body: "#374151",
  muted: "#64748b",
  faint: "#94a3b8",
  border: "#e5e7eb",
  panel: "#f8fafc",
  page: "#f6f7fb",
  approve: "#047857",
  reject: "#b91c1c",
  link: "#2563eb",
};

export type EmailButton = {
  label: string;
  href: string;
  variant?: "primary" | "approve" | "reject" | "neutral";
};

export type EmailDetailRow = {
  label: string;
  value: string;
};

function buttonBackground(variant: EmailButton["variant"]): string {
  switch (variant) {
    case "approve":
      return COLORS.approve;
    case "reject":
      return COLORS.reject;
    case "neutral":
      return "#475569";
    default:
      return COLORS.ink;
  }
}

export function renderEmailButtons(buttons: EmailButton[]): string {
  const cells = buttons
    .map(
      (button) => `
        <td align="center" style="padding:0;">
          <a href="${button.href}" style="display:inline-block;min-width:260px;box-sizing:border-box;border-radius:12px;background:${buttonBackground(
            button.variant,
          )};color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;line-height:1.2;padding:14px 32px;text-align:center;box-shadow:0 8px 20px rgba(15,23,42,0.16);">
            ${button.label}
          </a>
        </td>`,
    )
    .join("");

  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" align="center" style="margin:28px auto 16px;"><tr>${cells}</tr></table>`;
}

export function renderDetailTable(rows: EmailDetailRow[]): string {
  const body = rows
    .map(
      (row, index) => `
        <tr>
          <td style="padding:10px 16px;font-size:13px;color:${COLORS.muted};${
            index === 0 ? "" : `border-top:1px solid ${COLORS.border};`
          }white-space:nowrap;">${row.label}</td>
          <td style="padding:10px 16px;font-size:13px;color:${COLORS.ink};font-weight:600;${
            index === 0 ? "" : `border-top:1px solid ${COLORS.border};`
          }text-align:right;">${row.value}</td>
        </tr>`,
    )
    .join("");

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:8px 0 4px;border:1px solid ${COLORS.border};border-radius:16px;overflow:hidden;background:${COLORS.panel};">
      ${body}
    </table>`;
}

export type BrandedEmailOptions = {
  title: string;
  preheader?: string;
  heading: string;
  subheading?: string;
  contentHtml: string;
  footerNote?: string;
};

/** Wraps content in the shared iFranchise HRMS branded email shell. */
export function renderBrandedEmail(options: BrandedEmailOptions): string {
  const preheader = options.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${options.preheader}</div>`
    : "";
  const logoUrl = `${siteConfig.url}${EMAIL_BRAND_LOGO_PATH}`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${options.title}</title>
  </head>
  <body style="margin:0;background:${COLORS.page};font-family:Inter,Arial,sans-serif;color:${COLORS.ink};">
    ${preheader}
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${COLORS.page};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;overflow:hidden;border-radius:24px;background:#ffffff;border:1px solid ${COLORS.border};box-shadow:0 18px 50px rgba(15,23,42,0.08);">
            <tr>
              <td align="center" style="background:linear-gradient(135deg,${COLORS.headerFrom},${COLORS.headerTo});padding:36px 32px 32px;color:#ffffff;text-align:center;">
                <img src="${logoUrl}" width="52" height="52" alt="iFranchise" style="display:block;width:52px;height:52px;border:0;border-radius:14px;margin:0 auto 20px;" />
                <h1 style="margin:0;font-size:26px;line-height:1.3;font-weight:750;">${options.heading}</h1>
                ${
                  options.subheading
                    ? `<p style="margin:10px 0 0;color:#d1d5db;font-size:14px;line-height:1.6;">${options.subheading}</p>`
                    : ""
                }
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                ${options.contentHtml}
              </td>
            </tr>
            <tr>
              <td align="center" style="border-top:1px solid ${COLORS.border};padding:20px 32px;background:#fbfdff;text-align:center;">
                <p style="margin:0;font-size:12px;line-height:1.6;color:${COLORS.faint};">
                  ${options.footerNote ?? `${siteConfig.name} · Secure approvals`}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function renderParagraph(text: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:${COLORS.body};">${text}</p>`;
}

export function renderNote(text: string): string {
  return `<div style="border-radius:16px;background:${COLORS.panel};border:1px solid ${COLORS.border};padding:16px;margin:20px 0 4px;">
    <p style="margin:0;font-size:13px;line-height:1.6;color:${COLORS.muted};">${text}</p>
  </div>`;
}
