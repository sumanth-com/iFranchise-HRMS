"use client";

import { format } from "date-fns";
import { AlertTriangle, Check, Loader2, PackageX, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { EmptyState } from "@/components/common/empty-state";
import { Input } from "@/components/common/input";
import { Modal } from "@/components/common/modal";
import { Label } from "@/components/ui/label";
import { decideAssetReturnAction } from "@/lib/exit/actions";
import {
  ASSET_RETURN_STATUS_LABELS,
  canClearanceExit,
  EXIT_STATUS_LABELS,
} from "@/lib/exit/constants";
import { formatCurrencyInr } from "@/lib/exit/services/exit-utils";
import {
  assetReturnDecisionSchema,
  type AssetReturnDecisionValues,
} from "@/lib/validations/exit";
import type {
  ExitAssetReturnItem,
  ExitAssetReturnStatus,
  ExitResignationItem,
} from "@/types/exit";

type Props = {
  queue: ExitResignationItem[];
  permissionCodes: string[];
};

type DecisionFormInput = {
  returnId: string;
  returnStatus: "returned" | "damaged" | "lost" | "replacement_required";
  conditionNotes: string | null;
  recoveryAmount: number | null;
};

function returnBadgeClass(status: ExitAssetReturnStatus) {
  if (status === "returned") return "bg-emerald-500/10 text-emerald-700";
  if (status === "damaged" || status === "lost") {
    return "bg-destructive/10 text-destructive";
  }
  if (status === "replacement_required") return "bg-amber-500/10 text-amber-700";
  return "bg-muted text-foreground";
}

export function AssetReturnManagement({ queue, permissionCodes }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<ExitAssetReturnItem | null>(null);
  const [employeeLabel, setEmployeeLabel] = useState("");
  const [open, setOpen] = useState(false);

  const canAct = canClearanceExit(permissionCodes);

  const form = useForm<DecisionFormInput>({
    resolver: zodResolver(assetReturnDecisionSchema) as never,
    defaultValues: {
      returnId: "",
      returnStatus: "returned",
      conditionNotes: null,
      recoveryAmount: 0,
    },
  });

  const returnStatus = form.watch("returnStatus");
  const needsRecovery = returnStatus === "damaged" || returnStatus === "lost";

  function openDecision(
    asset: ExitAssetReturnItem,
    status: DecisionFormInput["returnStatus"],
    employeeName: string,
  ) {
    setSelected(asset);
    setEmployeeLabel(employeeName);
    form.reset({
      returnId: asset.id,
      returnStatus: status,
      conditionNotes: null,
      recoveryAmount: needsRecoveryAmount(status) ? asset.recoveryAmount || 0 : 0,
    });
    setOpen(true);
  }

  function needsRecoveryAmount(status: DecisionFormInput["returnStatus"]) {
    return status === "damaged" || status === "lost";
  }

  function onSubmit(values: DecisionFormInput) {
    const payload: AssetReturnDecisionValues = {
      ...values,
      recoveryAmount: needsRecoveryAmount(values.returnStatus)
        ? Number(values.recoveryAmount ?? 0)
        : 0,
    };
    startTransition(async () => {
      const res = await decideAssetReturnAction(payload);
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      toast.success(`Asset marked as ${ASSET_RETURN_STATUS_LABELS[values.returnStatus]}`);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Asset Return</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Record returned, damaged, lost, or replacement-required assets during exit.
        </p>
      </div>

      {queue.every((r) => (r.assets ?? []).length === 0) ? (
        <EmptyState
          title="No asset returns pending"
          description="Assigned assets appear here once clearance begins."
        />
      ) : (
        <div className="space-y-4">
          {queue.map((resignation) => {
            const assets = resignation.assets ?? [];
            if (assets.length === 0) return null;
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
                    </p>
                  </div>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                    {EXIT_STATUS_LABELS[resignation.exitStatus]}
                  </span>
                </div>

                <div className="space-y-2">
                  {assets.map((asset) => (
                    <div
                      key={asset.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium">{asset.assetName}</p>
                        <p className="text-xs text-muted-foreground">
                          {asset.assetCode ?? "—"}
                          {asset.categoryName ? ` · ${asset.categoryName}` : ""}
                          {asset.recoveryAmount > 0
                            ? ` · Recovery ${formatCurrencyInr(asset.recoveryAmount)}`
                            : ""}
                        </p>
                        {asset.returnedAt ? (
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(asset.returnedAt), "dd MMM yyyy")}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${returnBadgeClass(asset.returnStatus)}`}
                        >
                          {ASSET_RETURN_STATUS_LABELS[asset.returnStatus]}
                        </span>
                        {canAct && asset.returnStatus === "pending" ? (
                          <div className="flex gap-1">
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              title="Returned"
                              onClick={() =>
                                openDecision(asset, "returned", resignation.employeeName)
                              }
                            >
                              <Check className="h-4 w-4 text-emerald-600" />
                            </Button>
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              title="Damaged"
                              onClick={() =>
                                openDecision(asset, "damaged", resignation.employeeName)
                              }
                            >
                              <AlertTriangle className="h-4 w-4 text-amber-600" />
                            </Button>
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              title="Lost"
                              onClick={() =>
                                openDecision(asset, "lost", resignation.employeeName)
                              }
                            >
                              <PackageX className="h-4 w-4 text-destructive" />
                            </Button>
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              title="Replacement required"
                              onClick={() =>
                                openDecision(
                                  asset,
                                  "replacement_required",
                                  resignation.employeeName,
                                )
                              }
                            >
                              <RefreshCw className="h-4 w-4" />
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
        title={`Asset: ${ASSET_RETURN_STATUS_LABELS[returnStatus]}`}
        description={
          selected ? `${employeeLabel} · ${selected.assetName}` : undefined
        }
        footer={
          <Button disabled={isPending} onClick={form.handleSubmit(onSubmit)}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Confirm
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Condition notes</Label>
            <textarea
              className="min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              disabled={isPending}
              {...form.register("conditionNotes")}
            />
          </div>
          {needsRecovery ? (
            <div className="space-y-2">
              <Label>Recovery amount (₹)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                disabled={isPending}
                {...form.register("recoveryAmount")}
              />
            </div>
          ) : null}
        </div>
      </Modal>
    </>
  );
}
