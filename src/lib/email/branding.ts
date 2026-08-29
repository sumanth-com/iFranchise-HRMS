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

/**
 * Renders primary action buttons for email clients.
 * Side-by-side on wider clients; stacks full-width on ~320–414px via media query.
 */
export function renderEmailButtons(buttons: EmailButton[]): string {
  if (buttons.length === 0) return "";

  const pair = buttons.length === 2;
  const cells = buttons
    .map((button, index) => {
      const padRight = pair && index === 0 ? "6px" : "0";
      const padLeft = pair && index === 1 ? "6px" : "0";
      return `
        <td class="email-btn-cell" align="center" valign="top" width="${pair ? "50%" : "100%"}" style="width:${pair ? "50%" : "100%"};padding:0 ${padRight} 10px ${padLeft};">
          <a href="${button.href}" class="email-btn" style="display:block;width:100%;box-sizing:border-box;border-radius:10px;background:${buttonBackground(
            button.variant,
          )};color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;line-height:1.25;padding:14px 18px;text-align:center;mso-padding-alt:0;">
            <!--[if mso]><i style="letter-spacing:28px;mso-font-width:-100%;mso-text-raise:21pt;">&nbsp;</i><![endif]-->
            <span style="mso-text-raise:10pt;">${button.label}</span>
            <!--[if mso]><i style="letter-spacing:28px;mso-font-width:-100%;">&nbsp;</i><![endif]-->
          </a>
        </td>`;
    })
    .join("");

  return `
    <table role="presentation" class="email-btn-table" width="100%" cellspacing="0" cellpadding="0" align="center" style="margin:24px auto 8px;width:100%;max-width:100%;">
      <tr>${cells}</tr>
    </table>`;
}

export function renderDetailTable(rows: EmailDetailRow[]): string {
  const body = rows
    .map(
      (row, index) => `
        <tr>
          <td class="email-detail-label" style="padding:11px 14px;font-size:13px;line-height:1.45;color:${COLORS.muted};${
            index === 0 ? "" : `border-top:1px solid ${COLORS.border};`
          }width:42%;vertical-align:top;">${row.label}</td>
          <td class="email-detail-value" style="padding:11px 14px;font-size:13px;line-height:1.45;color:${COLORS.ink};font-weight:600;${
            index === 0 ? "" : `border-top:1px solid ${COLORS.border};`
          }text-align:right;vertical-align:top;word-break:break-word;">${row.value}</td>
        </tr>`,
    )
    .join("");

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:8px 0 4px;border:1px solid ${COLORS.border};border-radius:14px;overflow:hidden;background:${COLORS.panel};">
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
    <meta name="x-apple-disable-message-reformatting" />
    <title>${options.title}</title>
    <style type="text/css">
      @media only screen and (max-width: 480px) {
        .email-shell { width: 100% !important; }
        .email-pad { padding: 22px 16px !important; }
        .email-header { padding: 28px 16px 24px !important; }
        .email-heading { font-size: 22px !important; }
        .email-btn-table, .email-btn-table tbody, .email-btn-table tr { display: block !important; width: 100% !important; }
        .email-btn-cell { display: block !important; width: 100% !important; padding: 0 0 10px 0 !important; }
        .email-btn { min-height: 48px !important; padding: 16px 18px !important; font-size: 16px !important; }
        .email-detail-label, .email-detail-value { display: block !important; width: 100% !important; text-align: left !important; padding: 6px 14px !important; }
        .email-detail-label { padding-top: 12px !important; border-top: none !important; }
        .email-detail-value { padding-bottom: 12px !important; font-size: 14px !important; }
      }
    </style>
  </head>
  <body style="margin:0;background:${COLORS.page};font-family:Inter,Arial,Helvetica,sans-serif;color:${COLORS.ink};-webkit-text-size-adjust:100%;">
    ${preheader}
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${COLORS.page};padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" class="email-shell" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;overflow:hidden;border-radius:20px;background:#ffffff;border:1px solid ${COLORS.border};box-shadow:0 12px 36px rgba(15,23,42,0.07);">
            <tr>
              <td class="email-header" align="center" style="background:linear-gradient(135deg,${COLORS.headerFrom},${COLORS.headerTo});padding:32px 28px 28px;color:#ffffff;text-align:center;">
                <img src="${logoUrl}" width="48" height="48" alt="iFranchise" style="display:block;width:48px;height:48px;border:0;border-radius:12px;margin:0 auto 16px;" />
                <h1 class="email-heading" style="margin:0;font-size:24px;line-height:1.3;font-weight:700;">${options.heading}</h1>
                ${
                  options.subheading
                    ? `<p style="margin:8px 0 0;color:#d1d5db;font-size:14px;line-height:1.55;">${options.subheading}</p>`
                    : ""
                }
              </td>
            </tr>
            <tr>
              <td class="email-pad" style="padding:28px 28px 20px;">
                ${options.contentHtml}
              </td>
            </tr>
            <tr>
              <td align="center" style="border-top:1px solid ${COLORS.border};padding:16px 24px;background:#fbfdff;text-align:center;">
                <p style="margin:0;font-size:12px;line-height:1.55;color:${COLORS.faint};">
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
  return `<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:${COLORS.body};">${text}</p>`;
}

export function renderNote(text: string): string {
  return `<div style="border-radius:12px;background:${COLORS.panel};border:1px solid ${COLORS.border};padding:14px;margin:16px 0 4px;">
    <p style="margin:0;font-size:12px;line-height:1.55;color:${COLORS.muted};">${text}</p>
  </div>`;
}
