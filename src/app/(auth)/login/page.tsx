import { LoginForm } from "@/components/auth/login-form";
import { DesktopOnlyGate } from "@/components/layout/desktop-only-gate";

type LoginPageProps = {
  searchParams: Promise<{
    email?: string | string[];
    error?: string | string[];
    redirectTo?: string | string[];
  }>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <DesktopOnlyGate>
      <LoginForm
        queryParams={{
          email: firstParam(params.email),
          error: firstParam(params.error),
          redirectTo: firstParam(params.redirectTo),
        }}
      />
    </DesktopOnlyGate>
  );
}
