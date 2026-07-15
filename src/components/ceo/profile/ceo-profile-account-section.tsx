"use client";

import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import {
  changeCeoPasswordAction,
  signOutOtherCeoSessionsAction,
  toggleCeoMfaAction,
  verifyCeoMfaAction,
} from "@/lib/ceo/actions/ceo-profile-actions";
import type { CeoAccountInfo } from "@/types/ceo-profile";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-background/80 px-3 py-2.5">
      <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <div className="mt-1 text-sm font-medium break-words">{value || "—"}</div>
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
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaQr, setMfaQr] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [isPending, startTransition] = useTransition();

  function changePassword() {
    startTransition(async () => {
      const result = await changeCeoPasswordAction({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      if (result.success) {
        toast.success(result.message);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setShowPasswordForm(false);
        onUpdated();
      } else {
        toast.error(result.message);
      }
    });
  }

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
    <section id="account" className="rounded-xl border bg-card p-4 shadow-sm md:p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Account</h2>
        <p className="text-sm text-muted-foreground">
          Manage password, two-factor authentication, and active sessions.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Field label="Email" value={account.email} />
        <Field label="Username" value={account.username} />
        <Field
          label="Last Login"
          value={
            account.lastLoginAt
              ? format(new Date(account.lastLoginAt), "dd MMM yyyy HH:mm")
              : "—"
          }
        />
        <Field
          label="Last Password Change"
          value={
            account.passwordLastChangedAt
              ? format(new Date(account.passwordLastChangedAt), "dd MMM yyyy HH:mm")
              : "—"
          }
        />
        <Field
          label="Two-Factor Authentication"
          value={account.twoFactorEnabled ? "Enabled" : "Disabled"}
        />
        <Field label="Active Sessions" value={String(account.activeSessionCount)} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => setShowPasswordForm((value) => !value)}
        >
          Change Password
        </Button>
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
          Sign Out Other Sessions
        </Button>
      </div>

      {showPasswordForm ? (
        <div className="mt-4 grid max-w-xl gap-3 md:grid-cols-3">
          <Input
            type="password"
            placeholder="Current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            disabled={isPending}
          />
          <Input
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={isPending}
          />
          <Input
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={isPending}
          />
          <Button
            type="button"
            size="sm"
            className="md:col-span-3"
            disabled={isPending}
            onClick={changePassword}
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Save Password
          </Button>
        </div>
      ) : null}

      {mfaQr ? (
        <div className="mt-4 space-y-3 rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">
            Scan this QR code, then enter the 6-digit code from your authenticator app.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mfaQr} alt="2FA QR code" className="size-40 rounded-md border bg-white p-2" />
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
