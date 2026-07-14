"use client";

import { Loader2, Mail, UserRoundPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { inviteTeamMemberAction } from "@/lib/manager/actions/team-invite-actions";

type ManagerInviteTeammateProps = {
  canInvite: boolean;
  inviteServiceReady: boolean;
};

export function ManagerInviteTeammate({
  canInvite,
  inviteServiceReady,
}: ManagerInviteTeammateProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isPending, startTransition] = useTransition();

  const disabled = !canInvite || !inviteServiceReady || isPending;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      toast.error("Enter a work email address");
      return;
    }

    startTransition(async () => {
      const result = await inviteTeamMemberAction({ email: trimmedEmail });
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      setEmail("");
      router.refresh();
    });
  }

  return (
    <div className="w-full shrink-0 xl:w-[320px]">
      <label className="mb-1.5 block text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        Invite teammate
      </label>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Mail className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@company.com"
            className="h-10 bg-background pl-8"
            disabled={disabled}
            aria-label="Teammate email"
          />
        </div>
        <Button
          type="submit"
          size="sm"
          className="h-10 shrink-0 gap-1.5 px-3"
          disabled={disabled}
        >
          {isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <UserRoundPlus className="size-3.5" />
          )}
          <span className="hidden sm:inline">Send</span>
        </Button>
      </form>
      {!inviteServiceReady ? (
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          Invitations are unavailable until email provisioning is configured.
        </p>
      ) : null}
    </div>
  );
}
