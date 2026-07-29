import Link from "next/link";
import { CheckCircle2, ShieldAlert, XCircle } from "lucide-react";

import { siteConfig } from "@/config/site";
import { verifyPayslipByReference } from "@/lib/payroll/services/payslip-verification";

type PayslipVerifyPageProps = {
  params: Promise<{ payslipRef: string }>;
};

export default async function PayslipVerifyPage({ params }: PayslipVerifyPageProps) {
  const { payslipRef } = await params;
  const result = await verifyPayslipByReference(payslipRef);

  if (!result.valid) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-muted/40 via-background to-muted/60 px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-lg">
          <XCircle className="mx-auto size-12 text-destructive" />
          <h1 className="mt-4 text-xl font-semibold tracking-tight">Invalid or Expired Payslip</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This QR code does not match a valid payslip in {siteConfig.name}. Contact HR if you
            believe this is an error.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex text-sm font-medium text-primary hover:underline"
          >
            Go to HRMS login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#f7f4ff] via-white to-[#ebe4ff] px-4 py-12">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-black/5 bg-white shadow-[0_20px_50px_-20px_rgba(79,70,229,0.35)]">
        <div className="bg-gradient-to-br from-[#7b5cff] to-[#4b3f8f] px-6 py-8 text-white">
          <div className="flex items-center gap-2 text-sm font-medium text-white/85">
            <ShieldAlert className="size-4" />
            Payslip Verification
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight">{result.companyName}</h1>
          <p className="mt-1 text-sm text-white/80">Secure HRMS Payslip Verification</p>
        </div>

        <div className="space-y-4 p-6">
          <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-100">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
            <div>
              <p className="font-semibold">{result.verificationStatus}</p>
              <p className="mt-1 text-sm opacity-90">
                This payslip was issued through {siteConfig.name}.
              </p>
            </div>
          </div>

          <dl className="divide-y rounded-xl border bg-card text-sm">
            <div className="flex justify-between gap-4 px-4 py-3">
              <dt className="text-muted-foreground">Employee Name</dt>
              <dd className="font-medium text-right">{result.employeeName}</dd>
            </div>
            <div className="flex justify-between gap-4 px-4 py-3">
              <dt className="text-muted-foreground">Employee ID</dt>
              <dd className="font-mono font-medium">{result.employeeCode}</dd>
            </div>
            <div className="flex justify-between gap-4 px-4 py-3">
              <dt className="text-muted-foreground">Payslip Number</dt>
              <dd className="font-mono text-right text-xs font-medium break-all sm:text-sm">
                {result.payslipNumber}
              </dd>
            </div>
            <div className="flex justify-between gap-4 px-4 py-3">
              <dt className="text-muted-foreground">Payroll Month</dt>
              <dd className="font-medium">{result.payrollMonthLabel}</dd>
            </div>
            <div className="flex justify-between gap-4 px-4 py-3">
              <dt className="text-muted-foreground">Verification Status</dt>
              <dd className="font-medium text-right">{result.verificationStatus}</dd>
            </div>
            <div className="flex justify-between gap-4 px-4 py-3">
              <dt className="text-muted-foreground">Company Name</dt>
              <dd className="font-medium text-right">{result.companyName}</dd>
            </div>
          </dl>

          <p className="text-center text-xs text-muted-foreground">
            For full payslip details, sign in to your employee portal.
          </p>
        </div>
      </div>
    </main>
  );
}
