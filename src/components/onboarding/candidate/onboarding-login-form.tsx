"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import {
  candidateLoginAction,
  requestCandidateOtpAction,
  verifyCandidateOtpAction,
} from "@/lib/onboarding/actions/candidate-onboarding-actions";

export function OnboardingLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  function loginWithPassword() {
    startTransition(async () => {
      const result = await candidateLoginAction({ personalEmail: email, password });
      if (!result.success) toast.error(result.message);
      else window.location.href = "/onboarding/portal";
    });
  }

  function requestOtp() {
    startTransition(async () => {
      const result = await requestCandidateOtpAction({ personalEmail: email });
      toast[result.success ? "success" : "error"](result.message);
      if (result.success) setOtpSent(true);
    });
  }

  function verifyOtp() {
    startTransition(async () => {
      const result = await verifyCandidateOtpAction({ personalEmail: email, otp });
      if (!result.success) toast.error(result.message);
      else window.location.href = "/onboarding/portal";
    });
  }

  return (
    <div className="w-full max-w-md space-y-5 rounded-xl border bg-card p-6 shadow-sm">
      <div className="text-center space-y-2">
        <h1 className="text-xl font-semibold">Onboarding sign in</h1>
        <p className="text-sm text-muted-foreground">
          Use your personal email to access the onboarding portal.
        </p>
      </div>

      <div>
        <Label>Personal email</Label>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>

      <div>
        <Label>Password</Label>
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <Button className="mt-2 w-full" onClick={loginWithPassword} disabled={isPending}>
          Sign in with password
        </Button>
      </div>

      <div className="border-t pt-4 space-y-2">
        <p className="text-sm text-muted-foreground">Or use a one-time code</p>
        <Button variant="outline" className="w-full" onClick={requestOtp} disabled={isPending || !email}>
          Send verification code
        </Button>
        {otpSent && (
          <>
            <Input placeholder="6-digit code" value={otp} onChange={(e) => setOtp(e.target.value)} />
            <Button className="w-full" onClick={verifyOtp} disabled={isPending}>
              Verify code
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
