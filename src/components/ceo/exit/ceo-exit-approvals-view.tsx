"use client";

import { format } from "date-fns";
import { Check, Loader2, ThumbsDown, ThumbsUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import { Modal } from "@/components/common/modal";
import { Label } from "@/components/ui/label";
import { ceoDecideResignationAction } from "@/lib/exit/actions";
import { EXIT_STATUS_LABELS } from "@/lib/exit/constants";
import {
  resignationDecisionSchema,
  type ResignationDecisionValues,
} from "@/lib/validations/exit";
import type { ExitResignationItem } from "@/types/exit";

type Props = {
  pending: ExitResignationItem[];
};

export function CeoExitApprovalsView({ pending }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<ExitResignationItem | null>(null);
  const [decisionType, setDecisionType] = useState<"approve" | "reject">("approve");

  const decisionForm = useForm<ResignationDecisionValues>({
    resolver: zodResolver(resignationDecisionSchema) as never,
    defaultValues: {
      resignationId: "",
      decision: "approve",
      remarks: null,
      rejectedReason: null,
    },
  });

  const openDecision = useCallback(
    (row: ExitResignationItem, decision: "approve" | "reject") => {
      setSelected(row);
      setDecisionType(decision);
      decisionForm.reset({
        resignationId: row.id,
        decision,
        remarks: null,
        rejectedReason: decision === "reject" ? "" : null,
      });
    },
    [decisionForm],
  );

  const columns: DataTableColumn<ExitResignationItem>[] = [
    { key: "employeeName", header: "Employee" },
    { key: "departmentName", header: "Department", render: (row) => row.departmentName ?? "—" },
    {
      key: "resignationDate",
      header: "Submitted",
      render: (row) => format(new Date(row.resignationDate), "dd MMM yyyy"),
    },
    {
      key: "lastWorkingDay",
      header: "Last day",
      render: (row) => format(new Date(row.lastWorkingDay), "dd MMM yyyy"),
    },
    { key: "reason", header: "Reason" },
    {
      key: "status",
      header: "Status",
      render: (row) => EXIT_STATUS_LABELS[row.exitStatus],
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <div className="flex justify-end gap-1">
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => openDecision(row, "approve")}
          >
            <ThumbsUp className="mr-1 h-3.5 w-3.5" />
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => openDecision(row, "reject")}
          >
            <ThumbsDown className="mr-1 h-3.5 w-3.5 text-destructive" />
            Reject
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Exit Approvals</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Final CEO approval for resignations already cleared by manager and HR.
        </p>
      </div>

      <section className="rounded-xl border bg-card p-4 shadow-sm">
        <DataTable
          columns={columns}
          data={pending}
          emptyMessage="No resignations awaiting CEO approval."
        />
      </section>

      <Modal
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
        title={decisionType === "approve" ? "CEO approve resignation" : "CEO reject resignation"}
        description={selected ? `${selected.employeeName} · ${selected.reason}` : undefined}
        footer={
          <Button
            disabled={isPending}
            variant={decisionType === "reject" ? "destructive" : "default"}
            onClick={decisionForm.handleSubmit((values) => {
              startTransition(async () => {
                const result = await ceoDecideResignationAction(values);
                if (!result.success) toast.error(result.message);
                else {
                  toast.success(
                    decisionType === "approve"
                      ? "Resignation approved — clearance started"
                      : "Resignation rejected",
                  );
                  setSelected(null);
                  router.refresh();
                }
              });
            })}
          >
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {decisionType === "approve" ? (
              <>
                <Check className="mr-1.5 h-4 w-4" />
                Approve & start clearance
              </>
            ) : (
              "Reject"
            )}
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Remarks</Label>
            <textarea
              className="min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              disabled={isPending}
              {...decisionForm.register("remarks")}
            />
          </div>
          {decisionType === "reject" ? (
            <div className="space-y-2">
              <Label>Rejection reason</Label>
              <textarea
                className="min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                disabled={isPending}
                {...decisionForm.register("rejectedReason")}
              />
            </div>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}
