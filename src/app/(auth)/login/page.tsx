import { Suspense } from "react";

import { LoginForm } from "@/components/auth/login-form";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { DesktopOnlyGate } from "@/components/layout/desktop-only-gate";

export default function LoginPage() {
  return (
    <DesktopOnlyGate>
      <Suspense
        fallback={
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </DesktopOnlyGate>
  );
}
