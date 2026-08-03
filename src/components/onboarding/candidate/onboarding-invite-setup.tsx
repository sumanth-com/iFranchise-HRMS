"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import { setupCandidateAccountAction } from "@/lib/onboarding/actions/candidate-onboarding-actions";

type OnboardingInviteSetupProps = {
  token: string;
  personalEmail: string;
  fullName: string;
};

export function OnboardingInviteSetup({ token, personalEmail, fullName }: OnboardingInviteSetupProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const result = await setupCandidateAccountAction(token, { password, confirmPassword });
      if (!result.success) toast.error(result.message);
      else window.location.href = "/onboarding/portal";
    });
  }

  return (
    <div className="w-full max-w-md space-y-5 rounded-xl border bg-card p-6 shadow-sm">
      <div className="text-center space-y-2">
        <h1 className="text-xl font-semibold">Welcome, {fullName}</h1>
        <p className="text-sm text-muted-foreground">
          Create your temporary onboarding password for {personalEmail}.
        </p>
      </div>
      <div>
        <Label>Password</Label>
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <div>
        <Label>Confirm password</Label>
        <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
      </div>
      <Button className="w-full" onClick={submit} disabled={isPending}>
        Create account & continue
      </Button>
    </div>
  );
}
