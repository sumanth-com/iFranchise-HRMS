"use client";

import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { AccountPasswordResetSection } from "@/components/auth/account-password-reset-section";
import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import {
  signOutOtherCeoSessionsAction,
  toggleCeoMfaAction,
  verifyCeoMfaAction,
} from "@/lib/ceo/actions/ceo-profile-actions";
import type { CeoAccountInfo } from "@/types/ceo-profile";

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium">{value || "—"}</p>
    </div>
  );
}

export function CeoProfileAccountSection({
  account,
  onUpdated,
}: {
  account: CeoAccountInfo;
  onUpdated: () => void;
}) {
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaQr, setMfaQr] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [isPending, startTransition] = useTransition();

  function toggleMfa() {
    startTransition(async () => {
      const result = await toggleCeoMfaAction({ enable: !account.twoFactorEnabled });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      const data = result.data as
        | { qrCode?: string; factorId?: string }
        | undefined;
      if (data?.qrCode && data.factorId) {
        setMfaQr(data.qrCode);
        setMfaFactorId(data.factorId);
      } else {
        setMfaQr(null);
        setMfaFactorId(null);
        onUpdated();
      }
    });
  }

  function verifyMfa() {
    if (!mfaFactorId) return;
    startTransition(async () => {
      const result = await verifyCeoMfaAction({
        factorId: mfaFactorId,
        code: mfaCode,
      });
      if (result.success) {
        toast.success(result.message);
        setMfaCode("");
        setMfaQr(null);
        setMfaFactorId(null);
        onUpdated();
      } else {
        toast.error(result.message);
      }
    });
  }

  function signOutOthers() {
    startTransition(async () => {
      const result = await signOutOtherCeoSessionsAction();
      if (result.success) {
        toast.success(result.message);
        onUpdated();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <section id="account" className="rounded-xl border bg-card p-4 shadow-sm md:p-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold tracking-tight">Account & security</h2>
        <p className="text-xs text-muted-foreground">
          Password, two-factor authentication, and active sessions.
        </p>
      </div>

      <div className="grid gap-4 border-b pb-4 sm:grid-cols-2 lg:grid-cols-3">
        <Meta label="Work email" value={account.email} />
        <Meta
          label="Last login"
          value={
            account.lastLoginAt
              ? format(new Date(account.lastLoginAt), "d MMM yyyy HH:mm")
              : "—"
          }
        />
        <Meta
          label="2FA"
          value={account.twoFactorEnabled ? "Enabled" : "Off"}
        />
        <Meta
          label="Password changed"
          value={
            account.passwordLastChangedAt
              ? format(new Date(account.passwordLastChangedAt), "d MMM yyyy")
              : "—"
          }
        />
        <Meta label="Active sessions" value={String(account.activeSessionCount)} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={toggleMfa}
        >
          {account.twoFactorEnabled ? "Disable 2FA" : "Enable 2FA"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isPending || account.activeSessionCount <= 1}
          onClick={signOutOthers}
        >
          Sign out other devices
        </Button>
      </div>

      <div className="mt-4">
        <AccountPasswordResetSection
          email={account.email}
          embedded
          description="Send a secure reset link to your work email. Open the link to choose a new password, then sign in again."
        />
      </div>

      {mfaQr ? (
        <div className="mt-4 space-y-3 rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">
            Scan this QR code, then enter the 6-digit code from your authenticator app.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mfaQr}
            alt="2FA QR code"
            className="size-40 rounded-md border bg-white p-2"
          />
          <div className="flex max-w-sm gap-2">
            <Input
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
              placeholder="Verification code"
              disabled={isPending}
            />
            <Button type="button" size="sm" disabled={isPending} onClick={verifyMfa}>
              Verify
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
