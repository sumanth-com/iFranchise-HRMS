"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { Modal } from "@/components/common/modal";
import { PayslipView } from "@/components/payroll/payslip-view";
import { getEmployeePayslipDetailAction } from "@/lib/employee/actions/employee-payroll-actions";
import type { PayslipDetail } from "@/types/payroll";

type Props = {
  payslipId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function EmployeePayslipDrawer({ payslipId, open, onOpenChange }: Props) {
  const [detail, setDetail] = useState<PayslipDetail | null>(null);
  const [loading, setLoading] = useState(false);

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

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Payslip"
      description="Review and download your payslip."
      contentClassName="sm:max-w-4xl"
      cancelLabel="Close"
    >
      {loading ? (
        <div className="flex min-h-48 items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 size-4 animate-spin" />
          Loading payslip…
        </div>
      ) : detail ? (
        <PayslipView payslip={detail} canDownload canEmail />
      ) : (
        <div className="flex min-h-48 items-center justify-center text-sm text-muted-foreground">
          This payslip could not be loaded.
        </div>
      )}
    </Modal>
  );
}
