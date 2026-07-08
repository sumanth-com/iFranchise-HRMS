"use client";

import { format } from "date-fns";
import { Check, Loader2, MinusCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { EmptyState } from "@/components/common/empty-state";
import { Modal } from "@/components/common/modal";
import { Label } from "@/components/ui/label";
import { decideClearanceAction } from "@/lib/exit/actions";
import {
  canClearanceExit,
  CLEARANCE_STATUS_LABELS,
  EXIT_STATUS_LABELS,
} from "@/lib/exit/constants";
import {
  clearanceDecisionSchema,
  type ClearanceDecisionValues,
} from "@/lib/validations/exit";
import type { ExitClearanceItem, ExitClearanceStatus, ExitResignationItem } from "@/types/exit";

type Props = {
  queue: ExitResignationItem[];
  permissionCodes: string[];
};

type DecisionFormInput = {
  clearanceId: string;
  clearanceStatus: "approved" | "rejected" | "not_required";
  remarks: string | null;
};

function clearanceBadgeClass(status: ExitClearanceStatus) {
  if (status === "approved") return "bg-emerald-500/10 text-emerald-700";
  if (status === "rejected") return "bg-destructive/10 text-destructive";
  if (status === "not_required") return "bg-muted text-muted-foreground";
  return "bg-amber-500/10 text-amber-700";
}

export function ClearanceManagement({ queue, permissionCodes }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<ExitClearanceItem | null>(null);
  const [employeeLabel, setEmployeeLabel] = useState("");
  const [open, setOpen] = useState(false);

  const canAct = canClearanceExit(permissionCodes);

  const form = useForm<DecisionFormInput>({
    resolver: zodResolver(clearanceDecisionSchema) as never,
    defaultValues: {
      clearanceId: "",
      clearanceStatus: "approved",
      remarks: null,
    },
  });

  function openDecision(
    item: ExitClearanceItem,
    status: "approved" | "rejected" | "not_required",
    employeeName: string,
  ) {
    setSelected(item);
    setEmployeeLabel(employeeName);
    form.reset({
      clearanceId: item.id,
      clearanceStatus: status,
      remarks: null,
    });
    setOpen(true);
  }

  function onSubmit(values: DecisionFormInput) {
    const payload: ClearanceDecisionValues = values;
    startTransition(async () => {
      const res = await decideClearanceAction(payload);
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      toast.success(`Clearance marked as ${CLEARANCE_STATUS_LABELS[values.clearanceStatus]}`);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Clearance</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Department no-dues clearances for employees in the exit pipeline.
        </p>
      </div>

      {queue.length === 0 ? (
        <EmptyState
          title="No clearance items"
          description="Clearance appears after HR approves a resignation."
        />
      ) : (
        <div className="space-y-4">
          {queue.map((resignation) => {
            const items = resignation.clearance ?? [];
            if (items.length === 0) return null;
            return (
              <section
                key={resignation.id}
                className="rounded-xl border bg-card p-5 shadow-sm"
              >
                <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{resignation.employeeName}</p>
                    <p className="text-xs text-muted-foreground">
                      {resignation.employeeCode}
                      {resignation.departmentName ? ` · ${resignation.departmentName}` : ""}
                      {" · "}
                      LWD {format(new Date(resignation.lastWorkingDay), "dd MMM yyyy")}
                    </p>
                  </div>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                    {EXIT_STATUS_LABELS[resignation.exitStatus]}
                  </span>
                </div>

                <div className="space-y-2">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium">{item.departmentLabel}</p>
                        {item.remarks ? (
                          <p className="text-xs text-muted-foreground">{item.remarks}</p>
                        ) : null}
                        {item.actedAt ? (
                          <p className="text-xs text-muted-foreground">
                            Acted {format(new Date(item.actedAt), "dd MMM yyyy")}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${clearanceBadgeClass(item.clearanceStatus)}`}
                        >
                          {CLEARANCE_STATUS_LABELS[item.clearanceStatus]}
                        </span>
                        {canAct && item.clearanceStatus === "pending" ? (
                          <div className="flex gap-1">
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              title="Approve"
                              onClick={() =>
                                openDecision(item, "approved", resignation.employeeName)
                              }
                            >
                              <Check className="h-4 w-4 text-emerald-600" />
                            </Button>
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              title="Reject"
                              onClick={() =>
                                openDecision(item, "rejected", resignation.employeeName)
                              }
                            >
                              <X className="h-4 w-4 text-destructive" />
                            </Button>
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              title="Not required"
                              onClick={() =>
                                openDecision(item, "not_required", resignation.employeeName)
                              }
                            >
                              <MinusCircle className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <Modal
        open={open}
        onOpenChange={setOpen}
        title={`Mark clearance: ${selected ? CLEARANCE_STATUS_LABELS[form.watch("clearanceStatus")] : ""}`}
        description={
          selected
            ? `${employeeLabel} · ${selected.departmentLabel}`
            : undefined
        }
        footer={
          <Button disabled={isPending} onClick={form.handleSubmit(onSubmit)}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Confirm
          </Button>
        }
      >
        <div className="space-y-2">
          <Label>Remarks</Label>
          <textarea
            className="min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            disabled={isPending}
            {...form.register("remarks")}
          />
        </div>
      </Modal>
    </>
  );
}
