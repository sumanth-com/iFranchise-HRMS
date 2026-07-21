import { createNotification } from "@/lib/notifications/services/notification-service";
import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { CEO_ROUTES } from "@/lib/ceo/constants";
import { findProvisioningNotifierUserIds } from "@/lib/user-provisioning/provisionable-roles";

type ProvisioningNotificationEvent =
  | "invitation_accepted"
  | "invitation_expired"
  | "invitation_rejected"
  | "account_activated"
  | "role_changed";

const EVENT_COPY: Record<
  ProvisioningNotificationEvent,
  { title: string; buildMessage: (name: string, email: string) => string }
> = {
  invitation_accepted: {
    title: "Invitation accepted",
    buildMessage: (name, email) => `${name} (${email}) accepted their portal invitation.`,
  },
  invitation_expired: {
    title: "Invitation expired",
    buildMessage: (name, email) => `The invitation for ${name} (${email}) has expired.`,
  },
  invitation_rejected: {
    title: "Invitation declined",
    buildMessage: (name, email) => `${name} (${email}) declined or could not complete activation.`,
  },
  account_activated: {
    title: "Account activated",
    buildMessage: (name, email) => `${name} (${email}) activated their executive account.`,
  },
  role_changed: {
    title: "Role changed",
    buildMessage: (name, email) => `The role or portal access for ${name} (${email}) was updated.`,
  },
};

export async function notifyProvisioningStakeholders(
  supabase: AuthSupabaseClient,
  input: {
    organizationId: string;
    event: ProvisioningNotificationEvent;
    subjectName: string;
    subjectEmail: string;
    employeeId: string;
    actorUserId?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  const recipients = await findProvisioningNotifierUserIds(supabase, input.organizationId);
  if (recipients.length === 0) return;

  const copy = EVENT_COPY[input.event];

  await Promise.all(
    recipients.map((recipient) =>
      createNotification(supabase, {
        organizationId: input.organizationId,
        userId: recipient.userId,
        employeeId: recipient.employeeId,
        title: copy.title,
        message: copy.buildMessage(input.subjectName, input.subjectEmail),
        notificationType: `user_provisioning_${input.event}`,
        module: "security",
        priority: input.event === "invitation_expired" ? "high" : "medium",
        actionUrl: CEO_ROUTES.userProvisioning,
        sourceEventKey: `user_provisioning_${input.event}:${input.employeeId}:${Date.now()}`,
        createdBy: input.actorUserId ?? null,
        metadata: {
          employeeId: input.employeeId,
          event: input.event,
          ...input.metadata,
        },
      }),
    ),
  );
}
