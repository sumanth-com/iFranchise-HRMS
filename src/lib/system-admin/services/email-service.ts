import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { hasEmailTransport, sendEmail } from "@/lib/email/mailer";
import type { UserProfile } from "@/types/auth";

export type EmailLogRow = {
  id: string;
  toEmail: string;
  subject: string | null;
  status: string;
  errorMessage: string | null;
  messageId: string | null;
  createdAt: string;
  sentAt: string | null;
};

export type EmailServiceSnapshot = {
  transportConfigured: boolean;
  smtpHost: string | null;
  smtpPort: number | null;
  fromAddress: string | null;
  connectionStatus: "connected" | "disconnected" | "error";
  connectionMessage: string;
  queuedCount: number;
  failedCount24h: number;
  sentCount24h: number;
  sentCountMonth: number;
  recentLogs: EmailLogRow[];
};

async function logEmail(
  supabase: AuthSupabaseClient,
  organizationId: string,
  input: {
    toEmail: string;
    subject: string;
    status: "queued" | "sent" | "failed";
    errorMessage?: string;
    messageId?: string;
  },
): Promise<void> {
  await supabase.schema("hrms").from("system_email_logs").insert({
    organization_id: organizationId,
    to_email: input.toEmail,
    subject: input.subject,
    status: input.status,
    error_message: input.errorMessage ?? null,
    message_id: input.messageId ?? null,
    sent_at: input.status === "sent" ? new Date().toISOString() : null,
  });
}

export async function getEmailServiceSnapshot(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<EmailServiceSnapshot> {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const sinceMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [sent24h, failed24h, sentMonth, recentLogs] = await Promise.all([
    supabase
      .schema("hrms")
      .from("system_email_logs")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "sent")
      .gte("created_at", since24h)
      .is("deleted_at", null),
    supabase
      .schema("hrms")
      .from("system_email_logs")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "failed")
      .gte("created_at", since24h)
      .is("deleted_at", null),
    supabase
      .schema("hrms")
      .from("system_email_logs")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "sent")
      .gte("created_at", sinceMonth)
      .is("deleted_at", null),
    supabase
      .schema("hrms")
      .from("system_email_logs")
      .select("id, to_email, subject, status, error_message, message_id, created_at, sent_at")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  const configured = hasEmailTransport();
  let connectionStatus: EmailServiceSnapshot["connectionStatus"] = configured
    ? "connected"
    : "disconnected";
  let connectionMessage = configured
    ? "SMTP transport is configured on this environment."
    : "Set SMTP_HOST and credentials in environment variables.";

  if (configured) {
    try {
      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number.parseInt(process.env.SMTP_PORT ?? "587", 10),
        secure: process.env.SMTP_SECURE === "true",
        auth:
          process.env.SMTP_USER && process.env.SMTP_PASSWORD
            ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
            : undefined,
      });
      await transporter.verify();
      connectionStatus = "connected";
      connectionMessage = "SMTP connection verified successfully.";
    } catch (error) {
      connectionStatus = "error";
      connectionMessage =
        error instanceof Error ? error.message : "SMTP verification failed.";
    }
  }

  const queued = await supabase
    .schema("hrms")
    .from("system_email_logs")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("status", "queued")
    .is("deleted_at", null);

  return {
    transportConfigured: configured,
    smtpHost: process.env.SMTP_HOST ?? null,
    smtpPort: process.env.SMTP_PORT ? Number.parseInt(process.env.SMTP_PORT, 10) : null,
    fromAddress: process.env.EMAIL_FROM ?? null,
    connectionStatus,
    connectionMessage,
    queuedCount: queued.count ?? 0,
    failedCount24h: failed24h.count ?? 0,
    sentCount24h: sent24h.count ?? 0,
    sentCountMonth: sentMonth.count ?? 0,
    recentLogs: (recentLogs.data ?? []).map((row) => ({
      id: row.id as string,
      toEmail: row.to_email as string,
      subject: (row.subject as string | null) ?? null,
      status: row.status as string,
      errorMessage: (row.error_message as string | null) ?? null,
      messageId: (row.message_id as string | null) ?? null,
      createdAt: row.created_at as string,
      sentAt: (row.sent_at as string | null) ?? null,
    })),
  };
}

export async function sendTestEmail(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  toEmail: string,
): Promise<{ success: boolean; message: string }> {
  const subject = "iFranchise HRMS — SMTP Test";
  const html = `<p>This is a test email from System Administration.</p><p>Sent at ${new Date().toISOString()}</p>`;

  await logEmail(supabase, profile.employee.organizationId, {
    toEmail,
    subject,
    status: "queued",
  });

  const result = await sendEmail({ to: toEmail, subject, html });

  if (result.delivered) {
    await logEmail(supabase, profile.employee.organizationId, {
      toEmail,
      subject,
      status: "sent",
      messageId: result.messageId,
    });
    return { success: true, message: "Test email delivered successfully." };
  }

  const errorMessage = result.skipped
    ? "SMTP is not configured on this server."
    : result.error ?? "Email delivery failed.";

  await logEmail(supabase, profile.employee.organizationId, {
    toEmail,
    subject,
    status: "failed",
    errorMessage,
  });

  return { success: false, message: errorMessage };
}

export async function retryFailedEmails(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<number> {
  const { data } = await supabase
    .schema("hrms")
    .from("system_email_logs")
    .select("id, to_email, subject")
    .eq("organization_id", organizationId)
    .eq("status", "failed")
    .is("deleted_at", null)
    .limit(20);

  let retried = 0;
  for (const row of data ?? []) {
    const result = await sendEmail({
      to: row.to_email as string,
      subject: (row.subject as string) ?? "iFranchise HRMS Notification",
      html: "<p>Retry delivery from System Administration.</p>",
    });
    if (result.delivered) {
      await supabase
        .schema("hrms")
        .from("system_email_logs")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          error_message: null,
          message_id: result.messageId,
        })
        .eq("id", row.id);
      retried += 1;
    }
  }
  return retried;
}
