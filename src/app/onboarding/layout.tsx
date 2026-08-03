import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Onboarding",
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <header className="border-b bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-5 text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Secure pre-joining portal
          </p>
          <h1 className="mt-1 text-lg font-semibold tracking-tight">Employee Onboarding</h1>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:py-10">{children}</main>
    </div>
  );
}
