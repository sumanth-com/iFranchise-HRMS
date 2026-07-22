"use client";

import { Download, Mail, ShieldAlert } from "lucide-react";

import { Button } from "@/components/common/button";
import { PayslipTemplate } from "@/components/payroll/payslip-template";
import { usePayslipActions } from "@/lib/payroll/hooks/use-payslip-actions";
import { formatReviewBannerMessage } from "@/lib/payroll/services/payslip-publication";
import type { PayslipDetail } from "@/types/payroll";

type PayslipViewProps = {
  payslip: PayslipDetail;
  canDownload: boolean;
  canEmail: boolean;
  /** Hide inline action buttons (e.g. when actions render in a modal footer). */
  hideActions?: boolean;
};

export function PayslipView({
  payslip,
  canDownload,
  canEmail,
  hideActions = false,
}: PayslipViewProps) {
  const { handleDownload, handleEmail, isPending, underReview, showDownload, showEmail } =
    usePayslipActions(payslip, { canDownload, canEmail });

  return (
    <div className="space-y-4">
      {underReview ? (
        <div className="flex gap-3 rounded-lg border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-amber-950 print:hidden">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" />
          <p>{formatReviewBannerMessage(payslip.publishedAt)}</p>
        </div>
      ) : null}

      {!hideActions ? (
        <div className="flex flex-wrap gap-3 print:hidden">
          {showDownload ? (
            <Button variant="outline" onClick={() => void handleDownload()}>
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
          ) : null}
          {showEmail ? (
            <Button onClick={handleEmail} disabled={isPending}>
              <Mail className="mr-2 h-4 w-4" />
              Email payslip
            </Button>
          ) : null}
        </div>
      ) : null}

      {!underReview ? <PayslipTemplate payslip={payslip} /> : null}
    </div>
  );
}

export { usePayslipActions };
