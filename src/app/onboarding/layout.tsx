import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Onboarding",
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-slate-50">
      <div
        className="pointer-events-none fixed inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0 bg-gradient-to-b from-white/80 via-transparent to-slate-50/90"
        aria-hidden
      />

      <header className="sticky top-0 z-20 border-b border-border/60 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
              IF
            </div>
            <div>
              <p className="text-sm font-semibold leading-none tracking-tight">iFranchise HRMS</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Pre-joining onboarding</p>
            </div>
          </div>
          <span className="hidden rounded-full border bg-slate-50 px-3 py-1 text-[11px] font-medium text-muted-foreground sm:inline">
            Secure candidate portal
          </span>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-4 py-6 sm:py-8">{children}</main>
    </div>
  );
}
