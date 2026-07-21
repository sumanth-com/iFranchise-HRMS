import { Suspense } from "react";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { ResetPasswordSessionGate } from "@/components/auth/reset-password-session-gate";
import { LoadingSpinner } from "@/components/common/loading-spinner";

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      }
    >
      <ResetPasswordSessionGate>
        <ResetPasswordForm />
      </ResetPasswordSessionGate>
    </Suspense>
  );
}
