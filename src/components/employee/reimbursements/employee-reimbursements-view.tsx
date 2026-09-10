"use client";

import { format, parseISO } from "date-fns";
import {
  CheckCircle2,
  Clock3,
  Eye,
  FileUp,
  Loader2,
  Receipt,
  X,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { EmptyState } from "@/components/common/empty-state";
import { Input } from "@/components/common/input";
import { Modal } from "@/components/common/modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/common/select";
import {
  EmployeeSectionCard,
  EmployeeStatCard,
} from "@/components/employee/dashboard/employee-module-primitives";
import { ReimbursementStatusBadge } from "@/components/payroll/reimbursement-status-badge";
import { Label } from "@/components/ui/label";
import {
  cancelOwnPendingReimbursementAction,
  getReimbursementAttachmentUrlAction,
  submitOwnReimbursementClaimAction,
  uploadReimbursementAttachmentAction,
} from "@/lib/payroll/actions";
import {
  EMPLOYEE_REIMBURSEMENT_CATEGORIES,
  REIMBURSEMENT_ACCEPT_ATTR,
  REIMBURSEMENT_CATEGORY_LABELS,
  REIMBURSEMENT_FILE_HINT,
  REIMBURSEMENT_MAX_FILE_BYTES,
  REIMBURSEMENT_MAX_FILES,
  REIMBURSEMENT_STATUS_LABELS,
  isAllowedReimbursementExtension,
  isAllowedReimbursementMimeType,
} from "@/lib/payroll/constants";
import { formatCurrency } from "@/lib/payroll/services/payroll-utils";
import { cn } from "@/lib/utils";
import type {
  ReimbursementCategory,
  ReimbursementItem,
  ReimbursementSummary,
} from "@/types/payroll";

type Props = {
  summary: ReimbursementSummary;
  records: ReimbursementItem[];
  canCreate: boolean;
};

type UploadedFile = {
  path: string;
  name: string;
};

const SUMMARY_META = {
  pending: {
    icon: Clock3,
    accent: "text-amber-600 dark:text-amber-400",
    iconBg: "bg-amber-500/10",
    tone: "amber" as const,
  },
  approved: {
    icon: CheckCircle2,
    accent: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-500/10",
    tone: "emerald" as const,
  },
  paid: {
    icon: Receipt,
    accent: "text-violet-600 dark:text-violet-400",
    iconBg: "bg-violet-500/10",
    tone: "violet" as const,
  },
  rejected: {
    icon: XCircle,
    accent: "text-rose-600 dark:text-rose-400",
    iconBg: "bg-rose-500/10",
    tone: "rose" as const,
  },
};

function fileBaseName(path: string) {
  const segment = path.split("/").pop() ?? path;
  return segment.replace(/^[0-9a-f-]{36}-/i, "");
}

function isAllowedReimbursementFile(file: File) {
  if (file.size <= 0 || file.size > REIMBURSEMENT_MAX_FILE_BYTES) return false;
  if (!isAllowedReimbursementExtension(file.name)) return false;
  return isAllowedReimbursementMimeType(file.type);
}

function formatExpenseDate(value: string) {
  try {
    return format(parseISO(value), "dd MMM yyyy");
  } catch {
    return value;
  }
}

export function EmployeeReimbursementsView({
  summary,
  records,
  canCreate,
}: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);

  const [category, setCategory] = useState<ReimbursementCategory>("travel");
  const [expenseDate, setExpenseDate] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);

  const [selected, setSelected] = useState<ReimbursementItem | null>(null);
  const [openingPath, setOpeningPath] = useState<string | null>(null);

  const summaryCards = useMemo(() => {
    const byStatus = new Map(summary.cards.map((card) => [card.status, card]));
    return (["pending", "approved", "paid", "rejected"] as const).map((status) => {
      const card = byStatus.get(status);
      return {
        status,
        count: card?.count ?? 0,
        totalAmount: card?.totalAmount ?? 0,
      };
    });
  }, [summary.cards]);

  function resetForm() {
    setCategory("travel");
    setExpenseDate("");
    setAmount("");
    setDescription("");
    setAttachments([]);
    setUploadDone(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleFilesSelected(fileList: FileList | null) {
    if (!fileList?.length) return;

    const remaining = REIMBURSEMENT_MAX_FILES - attachments.length;
    if (remaining <= 0) {
      toast.error(`Max ${REIMBURSEMENT_MAX_FILES} files`);
      return;
    }

    const selectedFiles = Array.from(fileList).slice(0, remaining);
    const rejected = selectedFiles.filter((file) => !isAllowedReimbursementFile(file));
    if (rejected.length > 0) {
      toast.error("Use images or PDF · max 5 MB each");
      return;
    }

    setUploading(true);
    setUploadDone(false);
    try {
      const uploaded: UploadedFile[] = [];
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.set("file", file);
        const result = await uploadReimbursementAttachmentAction(formData);
        if (!result.success) {
          toast.error(result.message || `Upload failed: ${file.name}`);
          continue;
        }
        if (!result.data) {
          toast.error(`Upload failed: ${file.name}`);
          continue;
        }
        uploaded.push({ path: result.data, name: file.name });
      }
      if (uploaded.length > 0) {
        setAttachments((prev) => [...prev, ...uploaded]);
        setUploadDone(true);
        toast.success(
          uploaded.length === 1 ? "Attachment uploaded" : `${uploaded.length} files uploaded`,
        );
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removeAttachment(path: string) {
    setAttachments((prev) => prev.filter((item) => item.path !== path));
    setUploadDone(false);
  }

  function handleSubmit() {
    const parsedAmount = Number(amount);
    if (!expenseDate) {
      toast.error("Select an expense date");
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    const trimmedDescription = description.trim();
    if (trimmedDescription.length < 3) {
      toast.error("Add a short description");
      return;
    }

    startTransition(async () => {
      const result = await submitOwnReimbursementClaimAction({
        category,
        amount: parsedAmount,
        expenseDate,
        description: trimmedDescription,
        receiptPaths: attachments.map((item) => item.path),
      });
      if (!result.success) {
        toast.error(result.message || "Submit failed");
        return;
      }
      toast.success("Claim submitted");
      resetForm();
      router.refresh();
    });
  }

  function handleCancel(reimbursementId: string) {
    startTransition(async () => {
      const result = await cancelOwnPendingReimbursementAction(reimbursementId);
      if (!result.success) {
        toast.error(result.message || "Cancel failed");
        return;
      }
      toast.success("Claim cancelled");
      setSelected(null);
      router.refresh();
    });
  }

  async function openAttachment(path: string) {
    setOpeningPath(path);
    try {
      const result = await getReimbursementAttachmentUrlAction(path);
      if (!result.success) {
        toast.error(result.message || "Could not open file");
        return;
      }
      if (!result.data) {
        toast.error("Could not open file");
        return;
      }
      window.open(result.data, "_blank", "noopener,noreferrer");
    } finally {
      setOpeningPath(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reimbursements</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Submit expense claims and track approval through to payroll payment.
        </p>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {summaryCards.map((card) => {
          const meta = SUMMARY_META[card.status];
          return (
            <EmployeeStatCard
              key={card.status}
              label={REIMBURSEMENT_STATUS_LABELS[card.status]}
              value={String(card.count)}
              hint={formatCurrency(card.totalAmount)}
              icon={meta.icon}
              accent={meta.accent}
              iconBg={meta.iconBg}
              tone={meta.tone}
              compact
            />
          );
        })}
      </section>

      {canCreate ? (
        <EmployeeSectionCard
          title="Claim a Reimbursement"
          description="Attach receipts (images or PDF) and submit for HR review."
        >
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="reimbursement-type">Type</Label>
                <Select
                  value={category}
                  onValueChange={(value) => {
                    if (!value) return;
                    setCategory(value as ReimbursementCategory);
                  }}
                  disabled={isPending || uploading}
                >
                  <SelectTrigger id="reimbursement-type" className="w-full">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {EMPLOYEE_REIMBURSEMENT_CATEGORIES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {REIMBURSEMENT_CATEGORY_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expense-date">Expense Date</Label>
                <Input
                  id="expense-date"
                  type="date"
                  value={expenseDate}
                  onChange={(event) => setExpenseDate(event.target.value)}
                  disabled={isPending || uploading}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  disabled={isPending || uploading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="receipt-upload">Attachments</Label>
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-1.5"
                      disabled={
                        isPending ||
                        uploading ||
                        attachments.length >= REIMBURSEMENT_MAX_FILES
                      }
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {uploading ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : uploadDone ? (
                        <CheckCircle2 className="size-4 text-emerald-600" />
                      ) : (
                        <FileUp className="size-4" />
                      )}
                      {uploading
                        ? "Uploading…"
                        : uploadDone
                          ? "Uploaded"
                          : "Upload files"}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      {REIMBURSEMENT_FILE_HINT}
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    id="receipt-upload"
                    type="file"
                    className="sr-only"
                    accept={REIMBURSEMENT_ACCEPT_ATTR}
                    multiple
                    disabled={isPending || uploading}
                    onChange={(event) => handleFilesSelected(event.target.files)}
                  />
                  {attachments.length > 0 ? (
                    <ul className="space-y-1.5">
                      {attachments.map((file) => (
                        <li
                          key={file.path}
                          className="flex items-center justify-between gap-2 rounded-lg border bg-muted/20 px-3 py-2 text-sm"
                        >
                          <span className="min-w-0 truncate">{file.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 shrink-0 gap-1 px-2 text-muted-foreground"
                            disabled={isPending || uploading}
                            onClick={() => removeAttachment(file.path)}
                          >
                            <X className="size-3.5" />
                            Remove
                          </Button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                rows={3}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                disabled={isPending || uploading}
                placeholder="Briefly describe the expense"
                className={cn(
                  "flex min-h-20 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none",
                  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                )}
              />
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                className="gap-1.5"
                disabled={isPending || uploading}
                onClick={handleSubmit}
              >
                {isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Receipt className="size-4" />
                )}
                Submit Reimbursement Claim
              </Button>
            </div>
          </div>
        </EmployeeSectionCard>
      ) : null}

      <section className="rounded-2xl border bg-card shadow-sm">
        <div className="border-b px-5 py-4">
          <h2 className="text-base font-semibold tracking-tight">
            Reimbursement History
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your submitted claims with status, remarks, and attachments.
          </p>
        </div>

        {records.length === 0 ? (
          <EmptyState
            title="No reimbursement claims yet"
            description={
              canCreate
                ? "Submit your first expense claim using the form above."
                : "Reimbursement claims will appear here once submitted."
            }
            className="border-0 py-14"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 whitespace-nowrap">Date</th>
                  <th className="px-4 py-3 whitespace-nowrap">Type</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 whitespace-nowrap">Amount</th>
                  <th className="px-4 py-3 whitespace-nowrap">Status</th>
                  <th className="px-4 py-3">HR/CEO Remarks</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {records.map((row) => (
                  <tr key={row.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                      {formatExpenseDate(row.expenseDate)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {REIMBURSEMENT_CATEGORY_LABELS[row.category] ?? row.category}
                    </td>
                    <td className="max-w-[16rem] truncate px-4 py-3 text-muted-foreground">
                      {row.description?.trim() || "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums font-medium">
                      {formatCurrency(row.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <ReimbursementStatusBadge status={row.reimbursementStatus} />
                    </td>
                    <td className="max-w-[14rem] truncate px-4 py-3 text-muted-foreground">
                      {row.reviewRemarks?.trim() ||
                        row.rejectionReason?.trim() ||
                        "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1.5 px-2"
                          onClick={() => setSelected(row)}
                        >
                          <Eye className="size-3.5" />
                          View
                        </Button>
                        {row.reimbursementStatus === "pending" && canCreate ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8"
                            disabled={isPending}
                            onClick={() => handleCancel(row.id)}
                          >
                            Cancel
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        title="Reimbursement details"
        description={
          selected
            ? `${REIMBURSEMENT_CATEGORY_LABELS[selected.category]} · ${formatExpenseDate(selected.expenseDate)}`
            : undefined
        }
        contentClassName="sm:max-w-lg"
        showCancel={false}
        footer={
          selected?.reimbursementStatus === "pending" && canCreate ? (
            <Button
              type="button"
              variant="destructive"
              disabled={isPending}
              onClick={() => handleCancel(selected.id)}
            >
              {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Cancel claim
            </Button>
          ) : (
            <Button type="button" variant="secondary" onClick={() => setSelected(null)}>
              Close
            </Button>
          )
        }
      >
        {selected ? (
          <div className="space-y-4 text-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailField label="Status">
                <ReimbursementStatusBadge status={selected.reimbursementStatus} />
              </DetailField>
              <DetailField label="Amount">
                <span className="font-semibold tabular-nums">
                  {formatCurrency(selected.amount)}
                </span>
              </DetailField>
              <DetailField label="Type">
                {REIMBURSEMENT_CATEGORY_LABELS[selected.category]}
              </DetailField>
              <DetailField label="Expense date">
                {formatExpenseDate(selected.expenseDate)}
              </DetailField>
            </div>

            <DetailField label="Description">
              {selected.description?.trim() || "—"}
            </DetailField>

            <DetailField label="HR/CEO remarks">
              {selected.reviewRemarks?.trim() ||
                selected.rejectionReason?.trim() ||
                "—"}
            </DetailField>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Attachments</p>
              {(selected.receiptPaths?.length
                ? selected.receiptPaths
                : selected.receiptPath
                  ? [selected.receiptPath]
                  : []
              ).length === 0 ? (
                <p className="text-muted-foreground">No attachments</p>
              ) : (
                <ul className="space-y-1.5">
                  {(selected.receiptPaths?.length
                    ? selected.receiptPaths
                    : selected.receiptPath
                      ? [selected.receiptPath]
                      : []
                  ).map((path) => (
                    <li key={path}>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 max-w-full gap-1.5"
                        disabled={openingPath === path}
                        onClick={() => openAttachment(path)}
                      >
                        {openingPath === path ? (
                          <Loader2 className="size-3.5 shrink-0 animate-spin" />
                        ) : (
                          <Eye className="size-3.5 shrink-0" />
                        )}
                        <span className="truncate">{fileBaseName(path)}</span>
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function DetailField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="text-foreground">{children}</div>
    </div>
  );
}
