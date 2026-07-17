import nodemailer, { type Transporter } from "nodemailer";

import { siteConfig } from "@/config/site";

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
};

export type SendEmailResult =
  | { delivered: true; messageId: string }
  | { delivered: false; skipped: boolean; error?: string };

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  from: string;
};

let cachedTransporter: Transporter | null = null;

function readSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST;
  if (!host) return null;

  const port = Number.parseInt(process.env.SMTP_PORT ?? "587", 10);
  const user = process.env.SMTP_USER || undefined;
  const pass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS || undefined;
  const secure = process.env.SMTP_SECURE
    ? process.env.SMTP_SECURE === "true"
    : port === 465;
  const from =
    process.env.EMAIL_FROM ||
    process.env.SMTP_FROM ||
    `${siteConfig.name} <contact@ifranchise.in>`;

  return { host, port, secure, user, pass, from };
}

/** True when SMTP credentials are configured on this environment. */
export function hasEmailTransport(): boolean {
  return Boolean(process.env.SMTP_HOST);
}

function getTransporter(config: SmtpConfig): Transporter {
  if (cachedTransporter) return cachedTransporter;
  cachedTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.user && config.pass ? { user: config.user, pass: config.pass } : undefined,
  });
  return cachedTransporter;
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Sends a transactional email through the configured SMTP provider.
 * Never throws — returns a structured result so callers (invite flows, the
 * approval engine, etc.) can degrade gracefully when email is not configured.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const config = readSmtpConfig();

  if (!config) {
    // No SMTP configured (e.g. local dev). Surface it without breaking the flow.
    console.warn(
      `[email] SMTP not configured — skipping email to ${input.to} (subject: "${input.subject}"). ` +
        `Set SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASSWORD/EMAIL_FROM to enable delivery.`,
    );
    return { delivered: false, skipped: true };
  }

  try {
    const transporter = getTransporter(config);
    const info = await transporter.sendMail({
      from: config.from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text ?? stripHtml(input.html),
      replyTo: input.replyTo,
    });
    return { delivered: true, messageId: info.messageId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown email error";
    console.error(`[email] Failed to send to ${input.to}: ${message}`);
    return { delivered: false, skipped: false, error: message };
  }
}
