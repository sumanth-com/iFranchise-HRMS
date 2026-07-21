"use client";

import { format } from "date-fns";
import Link from "next/link";
import { Loader2, LogOut, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { buttonVariants } from "@/components/common/button";
import { Button } from "@/components/common/button";
import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import { withdrawResignationAction } from "@/lib/exit/actions";
import { EXIT_STATUS_LABELS } from "@/lib/exit/constants";
import { cn } from "@/lib/utils";
import type { ExitResignationItem } from "@/types/exit";

type Props = {
  applyHref: string;
  canApply: boolean;
  activeResignation: ExitResignationItem | null;
  history: ExitResignationItem[];
};

function statusClass(status: ExitResignationItem["exitStatus"]) {
  if (status === "completed") return "bg-emerald-500/10 text-emerald-700";
  if (status === "rejected" || status === "withdrawn") return "bg-destructive/10 text-destructive";
  if (["submitted", "manager_approved", "hr_approved"].includes(status)) {
    return "bg-amber-500/10 text-amber-700";
  }
  return "bg-muted text-foreground";
}

export function EmployeeResignationView({
  applyHref,
  canApply,
  activeResignation,
  history,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const columns: DataTableColumn<ExitResignationItem>[] = [
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
      key: "exitStatus",
      header: "Status",
      render: (row) => (
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClass(row.exitStatus)}`}>
          {EXIT_STATUS_LABELS[row.exitStatus]}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Resignation</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Submit your resignation and track approval by manager, HR, and CEO.
          </p>
        </div>
        {canApply && !activeResignation ? (
          <Link href={applyHref} className={cn(buttonVariants(), "gap-1.5")}>
            <LogOut className="h-4 w-4" />
            Apply resignation
          </Link>
        ) : null}
      </div>

      {activeResignation ? (
        <section className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Active request</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Last working day:{" "}
                {format(new Date(activeResignation.lastWorkingDay), "dd MMM yyyy")} · Reason:{" "}
                {activeResignation.reason}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${statusClass(activeResignation.exitStatus)}`}
            >
              {EXIT_STATUS_LABELS[activeResignation.exitStatus]}
            </span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <Step done={true} label="Submitted" />
            <Step
              done={activeResignation.exitStatus !== "submitted"}
              label="Manager"
            />
            <Step
              done={!["submitted", "manager_approved"].includes(activeResignation.exitStatus)}
              label="HR"
            />
            <Step
              done={!["submitted", "manager_approved", "hr_approved"].includes(
                activeResignation.exitStatus,
              )}
              label="CEO"
            />
          </div>
          {["submitted", "manager_approved", "hr_approved"].includes(
            activeResignation.exitStatus,
          ) ? (
            <Button
              className="mt-4"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => {
                startTransition(async () => {
                  const result = await withdrawResignationAction(activeResignation.id);
                  if (!result.success) toast.error(result.message);
                  else {
                    toast.success("Resignation withdrawn");
                    router.refresh();
                  }
                });
              }}
            >
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              <Undo2 className="mr-1.5 h-4 w-4" />
              Withdraw request
            </Button>
          ) : null}
        </section>
      ) : (
        <section className="rounded-xl border border-dashed bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
          No active resignation. Use Apply resignation when you are ready to initiate exit.
        </section>
      )}

      <section className="rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold">History</h2>
        <DataTable
          columns={columns}
          data={history}
          emptyMessage="No resignation history yet."
        />
      </section>
    </div>
  );
}

function Step({ done, label }: { done: boolean; label: string }) {
  return (
    <span
      className={cn(
        "rounded-full border px-2.5 py-1",
        done ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700" : "bg-background",
      )}
    >
      {label}
    </span>
  );
}
