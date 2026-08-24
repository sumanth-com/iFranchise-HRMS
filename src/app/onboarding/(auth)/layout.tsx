import type { ReactNode } from "react";

import { AuthLayout } from "@/components/layout/auth-layout";

export default function OnboardingAuthLayout({ children }: { children: ReactNode }) {
  return <AuthLayout>{children}</AuthLayout>;
}
