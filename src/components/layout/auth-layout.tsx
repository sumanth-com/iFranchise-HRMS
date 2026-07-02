import { type ReactNode } from "react";

type AuthLayoutProps = {
  children: ReactNode;
};

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-4">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground">
          IF
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          iFranchise HRMS
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enterprise Human Resource Management
        </p>
      </div>
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-sm">
        {children}
      </div>
    </div>
  );
}
