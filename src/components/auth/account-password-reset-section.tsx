"use client";

import { KeyRound, Loader2, Lock, MailCheck } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { requestPasswordResetEmailAction } from "@/lib/auth/actions";
import { getAuthErrorMessage } from "@/lib/auth/errors";
import { sendPasswordResetEmail } from "@/lib/auth/password-reset-client";
import { cn } from "@/lib/utils";

type AccountPasswordResetSectionProps = {
  email: string;
  description?: string;
  embedded?: boolean;
  className?: string;
};

function PasswordResetContent({
  email,
  description,
  embedded,
}: AccountPasswordResetSectionProps) {
  const [isPending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function requestReset() {
    setError(null);

    startTransition(async () => {
      const result = await requestPasswordResetEmailAction();

      if (!result.success) {
        setError(result.message);
        toast.error(result.message);
        return;
      }

      if (result.resolvedEmail) {
        const { error: resetError } = await sendPasswordResetEmail(
          result.resolvedEmail,
        );

        if (resetError) {
          const message = getAuthErrorMessage("SERVER_ERROR");
          setError(message);
          toast.error(message);
          return;
        }
      }

      setSent(true);
      toast.success("Password reset email sent");
    });
  }

  return (
    <>
      <div
        className={cn(
          !embedded
            ? "grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5"
            : "flex items-center justify-between gap-3",
        )}
      >
        {!embedded ? (
          <>
            <span className="col-start-1 row-span-3 flex size-9 items-center justify-center self-center rounded-md border bg-muted/40">
              <Lock className="size-4 text-muted-foreground" />
            </span>
            <h2 className="col-start-2 self-center text-sm font-semibold tracking-tight">
              Account & security
            </h2>
            {!sent ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="col-start-3 row-start-1 shrink-0 self-center"
                disabled={isPending}
                onClick={requestReset}
              >
                {isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <KeyRound className="size-3.5" />
                )}
                Reset password
              </Button>
            ) : (
              <span />
            )}
            <p className="col-span-2 col-start-2 whitespace-nowrap text-xs text-muted-foreground">
              Signed in as{" "}
              <span className="font-medium text-foreground">{email}</span>
            </p>
            {description ? (
              <p className="col-span-2 col-start-2 text-xs leading-snug text-muted-foreground">
                {description}
              </p>
            ) : null}
          </>
        ) : (
          <>
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="text-sm font-medium">Password</p>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
            {!sent ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="shrink-0"
                disabled={isPending}
                onClick={requestReset}
              >
                {isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <KeyRound className="size-3.5" />
                )}
                Reset password
              </Button>
            ) : null}
          </>
        )}
      </div>

      {error ? (
        <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {sent ? (
        <div className="mt-3 flex gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-3">
          <MailCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" />
          <div className="space-y-1 text-sm">
            <p className="font-medium text-emerald-900 dark:text-emerald-100">
              Check your email
            </p>
            <p className="text-emerald-800/90 dark:text-emerald-200/90">
              We sent a reset link to <span className="font-medium">{email}</span>.
              Open it to set a new password and confirm it, then sign in again.
            </p>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="mt-1 h-8 px-0 text-emerald-800 hover:bg-transparent hover:text-emerald-900 dark:text-emerald-200"
              disabled={isPending}
              onClick={requestReset}
            >
              Resend reset link
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function AccountPasswordResetSection({
  email,
  description = "Keep your account secure by using a strong, unique password.",
  embedded = false,
  className,
}: AccountPasswordResetSectionProps) {
  if (embedded) {
    return (
      <div className={cn("mt-4 rounded-lg border bg-muted/20 p-4", className)}>
        <PasswordResetContent
          email={email}
          description={description}
          embedded
        />
      </div>
    );
  }

  return (
    <section
      className={cn(
        "flex h-full flex-col justify-center rounded-xl border bg-card p-4 shadow-sm md:p-5",
        className,
      )}
    >
      <PasswordResetContent email={email} description={description} />
    </section>
  );
}
