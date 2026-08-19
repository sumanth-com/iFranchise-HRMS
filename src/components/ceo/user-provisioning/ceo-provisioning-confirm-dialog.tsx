"use client";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/common/button";
import { Modal } from "@/components/common/modal";
import type { ProvisioningRowAction } from "@/types/ceo-user-provisioning";

export type ProvisioningConfirmAction = Extract<
  ProvisioningRowAction,
  "cancel" | "delete" | "deactivate"
>;

type CeoProvisioningConfirmDialogProps = {
  action: ProvisioningConfirmAction | null;
  userName: string | null;
  userEmail: string | null;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

const COPY: Record<
  ProvisioningConfirmAction,
  { title: string; description: (name: string, email: string) => string; confirm: string; body: string }
> = {
  cancel: {
    title: "Cancel invitation?",
    description: (name, email) =>
      `This will withdraw the invitation for ${name} (${email}). They will no longer be able to activate with the current link.`,
    confirm: "Yes, cancel invitation",
    body: "You can send a new invitation later if needed.",
  },
  delete: {
    title: "Delete user permanently?",
    description: (name, email) =>
      `This will permanently remove ${name} (${email}) from the entire portal.`,
    confirm: "Delete permanently",
    body: "This will remove their account, login access, pending invitations, profile, and all associated HRMS records. This action cannot be undone. The same email can be re-invited later as a fresh user.",
  },
  deactivate: {
    title: "Deactivate user?",
    description: (name, email) =>
      `This will suspend portal access for ${name} (${email}) until the account is reactivated.`,
    confirm: "Yes, deactivate user",
    body: "The user will lose portal access immediately but their record will remain in the system.",
  },
};

export function CeoProvisioningConfirmDialog({
  action,
  userName,
  userEmail,
  isPending,
  onOpenChange,
  onConfirm,
}: CeoProvisioningConfirmDialogProps) {
  const open = Boolean(action && userName && userEmail);
  const copy = action ? COPY[action] : null;

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next && !isPending) onOpenChange(false);
      }}
      title={copy?.title ?? "Confirm action"}
      description={
        copy && userName && userEmail
          ? copy.description(userName, userEmail)
          : undefined
      }
      showCancel={false}
      contentClassName="sm:max-w-lg"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            Go back
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isPending || !copy}
            onClick={onConfirm}
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {copy?.confirm ?? "Confirm"}
          </Button>
        </>
      }
    >
      {copy ? <p className="text-sm text-muted-foreground">{copy.body}</p> : null}
    </Modal>
  );
}
