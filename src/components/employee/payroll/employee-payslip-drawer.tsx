"use client";

import { useEffect, useState } from "react";
import { Download, Loader2 } from "lucide-react";

import { Button } from "@/components/common/button";
import { Modal } from "@/components/common/modal";
import { PayslipView, usePayslipActions } from "@/components/payroll/payslip-view";
import { getEmployeePayslipDetailAction } from "@/lib/employee/actions/employee-payroll-actions";
import type { EmployeePayrollDisplaySummary } from "@/types/employee-payroll";
import type { PayslipDetail } from "@/types/payroll";

type Props = {
  payslipId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  overlaySummary?: EmployeePayrollDisplaySummary | null;
  overlayPayslipId?: string | null;
};

function PayslipDrawerFooter({
  payslip,
  onClose,
}: {
  payslip: PayslipDetail;
  onClose: () => void;
}) {
  const { handleDownload, showDownload } = usePayslipActions(payslip, {
    canDownload: payslip.canEmployeeAccess,
    canEmail: false,
  });

  return (
    <>
      {showDownload ? (
        <Button variant="outline" onClick={() => void handleDownload()}>
          <Download className="mr-2 h-4 w-4" />
          Download PDF
        </Button>
      ) : null}
      <Button variant="outline" onClick={onClose}>
        Close
      </Button>
    </>
  );
}

export function EmployeePayslipDrawer({
  payslipId,
  open,
  onOpenChange,
  overlaySummary = null,
  overlayPayslipId = null,
}: Props) {
  const [detail, setDetail] = useState<PayslipDetail | null>(null);
  const [loading, setLoading] = useState(false);

  function handleClose() {
    onOpenChange(false);
  }

  useEffect(() => {
    if (!open || !payslipId) return;
    let cancelled = false;
    setLoading(true);
    setDetail(null);
    void getEmployeePayslipDetailAction(payslipId).then((result) => {
      if (cancelled) return;
      setDetail(result);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, payslipId]);

  const displayDetail =
    detail && overlaySummary && overlayPayslipId === detail.id
      ? {
          ...detail,
          breakdown: {
            ...detail.breakdown,
            earnings: overlaySummary.earnings,
            deductions: overlaySummary.deductions,
          },
          grossSalary: overlaySummary.grossSalary,
          totalEarnings: overlaySummary.grossSalary,
          totalDeductions: overlaySummary.totalDeductions,
          netSalary: overlaySummary.netSalary,
        }
      : detail;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Payslip"
      description="Review and download your payslip."
      contentClassName="sm:max-w-5xl"
      showCancel={false}
      footer={
        displayDetail ? (
          <PayslipDrawerFooter payslip={displayDetail} onClose={handleClose} />
        ) : (
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
        )
      }
    >
      {loading ? (
        <div className="flex min-h-48 items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 size-4 animate-spin" />
          Loading payslip…
        </div>
      ) : displayDetail ? (
        <PayslipView
          payslip={displayDetail}
          canDownload={displayDetail.canEmployeeAccess}
          canEmail={false}
          hideActions
        />
      ) : (
        <div className="flex min-h-48 items-center justify-center text-sm text-muted-foreground">
          This payslip could not be loaded.
        </div>
      )}
    </Modal>
  );
}
