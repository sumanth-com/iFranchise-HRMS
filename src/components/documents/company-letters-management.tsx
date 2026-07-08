"use client";

import { format } from "date-fns";
import {
  CheckCircle2,
  Eye,
  FileText,
  Loader2,
  Plus,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import { EmptyState } from "@/components/common/empty-state";
import { Input } from "@/components/common/input";
import { Modal } from "@/components/common/modal";
import { Label } from "@/components/ui/label";
import { EmployeeSelect, LabeledSelect } from "@/components/payroll/payroll-select";
import {
  generateLetterAction,
  publishLetterAction,
} from "@/lib/documents/actions";
import {
  DOCUMENTS_ROUTES,
  LETTER_STATUS_LABELS,
  LETTER_TYPE_LABELS,
  LETTER_TYPE_OPTIONS,
  canGenerateLetters,
} from "@/lib/documents/constants";
import {
  generateLetterSchema,
  type GenerateLetterValues,
} from "@/lib/validations/documents";
import type { DocumentsLookups, LetterItem, LetterListResult } from "@/types/documents";

type GenerateLetterInput = {
  employeeId: string;
  letterType: GenerateLetterValues["letterType"];
  templateId: string | null;
  subject: string | null;
  bodyHtml?: string;
  salaryOverride: string | null;
  publishNow: boolean;
};

type Props = {
  result: LetterListResult;
  lookups: DocumentsLookups;
  permissionCodes: string[];
};

export function CompanyLettersManagement({ result, lookups, permissionCodes }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<LetterItem | null>(null);
  const canGenerate = canGenerateLetters(permissionCodes);

  const form = useForm<GenerateLetterInput>({
    resolver: zodResolver(generateLetterSchema) as never,
    defaultValues: {
      employeeId: "",
      letterType: "offer_letter",
      templateId: null,
      subject: null,
      bodyHtml: undefined,
      salaryOverride: null,
      publishNow: false,
    },
  });

  const letterType = form.watch("letterType");
  const templatesForType = lookups.templates.filter((t) => t.letterType === letterType);

  function updateParams(patch: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(patch).forEach(([key, value]) => {
      if (!value) params.delete(key);
      else params.set(key, value);
    });
    if (!patch.page) params.delete("page");
    startTransition(() => {
      router.push(`${DOCUMENTS_ROUTES.letters}?${params.toString()}`);
    });
  }

  function onGenerate(values: GenerateLetterInput) {
    startTransition(async () => {
      const resultAction = await generateLetterAction(values);
      if (!resultAction.success) {
        toast.error(resultAction.message);
        return;
      }
      toast.success(
        values.publishNow
          ? "Letter generated and stored in employee documents"
          : "Letter generated (pending HR approval)",
      );
      setOpen(false);
      form.reset();
      router.refresh();
    });
  }

  const onPublish = useCallback(
    (letterId: string) => {
      startTransition(async () => {
        const res = await publishLetterAction(letterId);
        if (!res.success) {
          toast.error(res.message);
          return;
        }
        toast.success("Letter published to employee documents");
        setPreview(null);
        router.refresh();
      });
    },
    [router],
  );

  const columns = useMemo<DataTableColumn<LetterItem & Record<string, unknown>>[]>(
    () => [
      {
        key: "letterNumber",
        header: "Letter",
        render: (row) => (
          <div>
            <p className="font-medium">{row.letterNumber ?? "—"}</p>
            <p className="text-xs text-muted-foreground">{row.subject}</p>
          </div>
        ),
      },
      {
        key: "employeeName",
        header: "Employee",
        render: (row) => (
          <div>
            <p className="font-medium">{row.employeeName}</p>
            <p className="text-xs text-muted-foreground">{row.employeeCode}</p>
          </div>
        ),
      },
      {
        key: "letterType",
        header: "Type",
        render: (row) => LETTER_TYPE_LABELS[row.letterType],
      },
      {
        key: "letterStatus",
        header: "Status",
        render: (row) => (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
            {LETTER_STATUS_LABELS[row.letterStatus]}
          </span>
        ),
      },
      {
        key: "createdAt",
        header: "Created",
        render: (row) => format(new Date(row.createdAt), "dd MMM yyyy"),
      },
      {
        key: "actions",
        header: "Actions",
        render: (row) => (
          <div className="flex flex-wrap gap-1">
            <Button size="icon-sm" variant="ghost" onClick={() => setPreview(row)} aria-label="Preview">
              <Eye className="h-4 w-4" />
            </Button>
            {canGenerate && row.letterStatus === "pending_approval" ? (
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => onPublish(row.id)}
                aria-label="Publish"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </Button>
            ) : null}
            {row.employeeDocumentId ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  router.push(
                    `${DOCUMENTS_ROUTES.employeeDocuments}?employeeId=${row.employeeId}`,
                  )
                }
              >
                View file
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [canGenerate, onPublish, router],
  );

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Company Letters</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Generate professional letters, preview, approve, and store them in employee folders.
          </p>
        </div>
        {canGenerate ? (
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Generate Letter
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 rounded-xl border bg-card p-4 shadow-sm md:grid-cols-2 xl:grid-cols-4">
        <Input
          placeholder="Search subject or number…"
          defaultValue={searchParams.get("search") ?? ""}
          onBlur={(e) => updateParams({ search: e.target.value || undefined })}
        />
        <LabeledSelect
          items={[
            { value: "__all__", label: "All employees" },
            ...lookups.employees.map((e) => ({ value: e.id, label: e.label })),
          ]}
          value={searchParams.get("employeeId") || "__all__"}
          onValueChange={(value) =>
            updateParams({ employeeId: value === "__all__" ? undefined : value })
          }
          placeholder="All employees"
        />
        <LabeledSelect
          items={[
            { value: "__all__", label: "All types" },
            ...LETTER_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
          ]}
          value={searchParams.get("letterType") || "__all__"}
          onValueChange={(value) =>
            updateParams({ letterType: value === "__all__" ? undefined : value })
          }
        />
        <LabeledSelect
          items={[
            { value: "__all__", label: "All statuses" },
            ...Object.entries(LETTER_STATUS_LABELS).map(([value, label]) => ({
              value,
              label,
            })),
          ]}
          value={searchParams.get("letterStatus") || "__all__"}
          onValueChange={(value) =>
            updateParams({ letterStatus: value === "__all__" ? undefined : value })
          }
        />
      </div>

      {result.data.length === 0 ? (
        <EmptyState
          title="No letters yet"
          description="Generate an offer, appointment, promotion, or other company letter."
        />
      ) : (
        <DataTable columns={columns} data={result.data} />
      )}

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Page {result.page} · {result.total} letters
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={result.page <= 1 || isPending}
            onClick={() => updateParams({ page: String(result.page - 1) })}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={result.page * result.pageSize >= result.total || isPending}
            onClick={() => updateParams({ page: String(result.page + 1) })}
          >
            Next
          </Button>
        </div>
      </div>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Generate Company Letter"
        description="Auto-fills employee and company details from their profile."
        contentClassName="sm:max-w-2xl"
        footer={
          <Button onClick={form.handleSubmit(onGenerate)} disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
            Generate PDF
          </Button>
        }
      >
        <form className="space-y-4" onSubmit={form.handleSubmit(onGenerate)}>
          <div className="space-y-2">
            <Label>Employee</Label>
            <EmployeeSelect
              employees={lookups.employees}
              value={form.watch("employeeId")}
              onValueChange={(value) => form.setValue("employeeId", value, { shouldValidate: true })}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Letter Type</Label>
              <LabeledSelect
                items={LETTER_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                value={letterType}
                onValueChange={(value) =>
                  form.setValue("letterType", value as GenerateLetterInput["letterType"], {
                    shouldDirty: true,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Template</Label>
              <LabeledSelect
                items={[
                  { value: "__default__", label: "Default template" },
                  ...templatesForType.map((t) => ({ value: t.id, label: t.label })),
                ]}
                value={form.watch("templateId") || "__default__"}
                onValueChange={(value) =>
                  form.setValue("templateId", value === "__default__" ? null : value)
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Salary Override (optional)</Label>
            <Input
              placeholder="Shown as {{salary}} when set"
              {...form.register("salaryOverride")}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 rounded border-input"
              checked={Boolean(form.watch("publishNow"))}
              onChange={(e) => form.setValue("publishNow", e.target.checked)}
            />
            Publish immediately and store in Employee Documents
          </label>
        </form>
      </Modal>

      <Modal
        open={Boolean(preview)}
        onOpenChange={(next) => !next && setPreview(null)}
        title={preview?.subject ?? "Letter Preview"}
        description={preview?.letterNumber ?? undefined}
        contentClassName="sm:max-w-3xl"
        showCancel
        footer={
          preview?.letterStatus === "pending_approval" && canGenerate ? (
            <Button onClick={() => preview && onPublish(preview.id)} disabled={isPending}>
              Publish Letter
            </Button>
          ) : null
        }
      >
        {preview ? (
          <div
            className="prose prose-sm max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: preview.bodyHtml }}
          />
        ) : null}
      </Modal>
    </>
  );
}
