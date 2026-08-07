"use client";

import { useEffect, useState } from "react";
import { Download, Loader2 } from "lucide-react";

import { Button } from "@/components/common/button";
import { Modal } from "@/components/common/modal";
import { PayslipView, usePayslipActions } from "@/components/payroll/payslip-view";
import { fetchPayslipDetailAction } from "@/lib/payroll/actions";
import type { PayslipDetail } from "@/types/payroll";

type EmployeeDetailPayslipDrawerProps = {
  payslipId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function PayslipDrawerFooter({
  payslip,
  onClose,
}: {
  payslip: PayslipDetail;
  onClose: () => void;
}) {
  const { handleDownload, showDownload } = usePayslipActions(payslip, {
    canDownload: true,
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

export function EmployeeDetailPayslipDrawer({
  payslipId,
  open,
  onOpenChange,
}: EmployeeDetailPayslipDrawerProps) {
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
    void fetchPayslipDetailAction(payslipId).then((result) => {
      if (cancelled) return;
      setDetail(result);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, payslipId]);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Payslip"
      description="Review and download this employee's payslip."
      contentClassName="sm:max-w-5xl"
      showCancel={false}
      footer={
        detail ? (
          <PayslipDrawerFooter payslip={detail} onClose={handleClose} />
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
      ) : detail ? (
        <PayslipView payslip={detail} canDownload canEmail={false} hideActions />
      ) : (
        <div className="flex min-h-48 items-center justify-center text-sm text-muted-foreground">
          This payslip could not be loaded.
        </div>
      )}
    </Modal>
  );
}
