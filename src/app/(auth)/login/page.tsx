import { Suspense } from "react";

import { LoginForm } from "@/components/auth/login-form";
import { LoadingSpinner } from "@/components/common/loading-spinner";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
