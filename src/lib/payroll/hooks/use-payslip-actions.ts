"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { emailPayslipAction } from "@/lib/payroll/actions";
import type { PayslipDetail } from "@/types/payroll";

type Options = {
  canDownload: boolean;
  canEmail: boolean;
};

export function usePayslipActions(payslip: PayslipDetail, { canDownload, canEmail }: Options) {
  const [isPending, startTransition] = useTransition();
  const underReview = payslip.availability === "under_review" && !canDownload;

  async function handleDownload() {
    try {
      const response = await fetch(`/api/payslips/${payslip.id}/pdf`);
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message ?? "Failed to generate payslip PDF");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `Payslip-${payslip.payslipNumber}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to download payslip");
    }
  }

  function handleEmail() {
    startTransition(async () => {
      const result = await emailPayslipAction(payslip.id);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Payslip email sent to employee");
    });
  }

  return {
    handleDownload,
    handleEmail,
    isPending,
    underReview,
    showDownload: canDownload && !underReview,
    showEmail: canEmail && !underReview,
  };
}
