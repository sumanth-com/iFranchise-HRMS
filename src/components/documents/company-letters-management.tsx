"use client";

import { format } from "date-fns";
import {
  CheckCircle2,
  CircleUserRound,
  Eye,
  FileText,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
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
  deleteCompanyLetterAction,
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
  const [deleteTarget, setDeleteTarget] = useState<LetterItem | null>(null);
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
  const selectedTemplateId = form.watch("templateId");
  const selectedTemplateName =
    lookups.templates.find((template) => template.id === selectedTemplateId)?.label ??
    "Default template";
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
      form.reset({
        employeeId: "",
        letterType: "offer_letter",
        templateId: null,
        subject: null,
        bodyHtml: undefined,
        salaryOverride: null,
        publishNow: false,
      });
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

  const onDelete = useCallback(
    (letterId: string) => {
      startTransition(async () => {
        const res = await deleteCompanyLetterAction(letterId);
        if (!res.success) {
          toast.error(res.message);
          return;
        }
        toast.success("Letter deleted");
        setDeleteTarget(null);
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
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <CircleUserRound className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-medium">{row.employeeName}</p>
              <p className="text-xs text-muted-foreground">{row.employeeCode}</p>
            </div>
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
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => setPreview(row)}
              aria-label="Preview letter"
              title="Preview letter"
            >
              <Eye className="h-4 w-4" />
            </Button>
            {canGenerate && row.letterStatus === "pending_approval" ? (
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => onPublish(row.id)}
                aria-label="Publish letter"
                title="Publish letter"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </Button>
            ) : null}
            {canGenerate ? (
              <Button
                size="icon-sm"
                variant="destructive"
                onClick={() => setDeleteTarget(row)}
                aria-label="Delete letter"
                title="Delete letter"
              >
                <Trash2 className="h-4 w-4" />
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
            Generate, preview, approve, and store polished company letters in employee folders.
          </p>
        </div>
        {canGenerate ? (
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Generate Letter
          </Button>
        ) : null}
      </div>

      <div className="relative z-20 grid gap-3 rounded-xl border bg-card p-4 shadow-sm md:grid-cols-2 xl:grid-cols-4">
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
          contentClassName="min-w-72"
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
            ...Object.entries(LETTER_STATUS_LABELS)
              .filter(([value]) => value !== "archived")
              .map(([value, label]) => ({
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
        <div className="rounded-2xl border bg-gradient-to-br from-card via-card to-primary/5 p-10 text-center shadow-sm">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <FileText className="size-6" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">No company letters yet</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            Generate offer, appointment, promotion, appreciation, and settlement letters from
            professional templates. Published letters are stored automatically in Employee Documents.
          </p>
          {canGenerate ? (
            <Button className="mt-5" onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Generate first letter
            </Button>
          ) : null}
        </div>
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
        description="Choose an employee, select a professional template, then generate or publish the letter."
        contentClassName="sm:max-w-4xl"
        footer={
          <Button onClick={form.handleSubmit(onGenerate)} disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
            {form.watch("publishNow") ? "Generate & Publish" : "Generate for Approval"}
          </Button>
        }
      >
        <form className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]" onSubmit={form.handleSubmit(onGenerate)}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Employee</Label>
              <EmployeeSelect
                employees={lookups.employees}
                value={form.watch("employeeId")}
                onValueChange={(value) => form.setValue("employeeId", value, { shouldValidate: true })}
              />
            </div>
            <div className="space-y-2">
              <Label>Letter Type</Label>
              <LabeledSelect
                items={LETTER_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                value={letterType}
                onValueChange={(value) => {
                  form.setValue("letterType", value as GenerateLetterInput["letterType"], {
                    shouldDirty: true,
                  });
                  form.setValue("templateId", null, { shouldDirty: true });
                }}
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
                contentClassName="min-w-72"
              />
            </div>
            <div className="space-y-2">
              <Label>Salary Override (optional)</Label>
              <Input
                placeholder="Shown as {{salary}} when set"
                {...form.register("salaryOverride")}
              />
            </div>
            <label className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2 text-sm">
              <input
                type="checkbox"
                className="size-4 rounded border-input"
                checked={Boolean(form.watch("publishNow"))}
                onChange={(e) => form.setValue("publishNow", e.target.checked)}
              />
              Publish immediately and store in Employee Documents
            </label>
          </div>

          <div className="rounded-2xl border bg-gradient-to-br from-card via-card to-primary/5 p-4">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Sparkles className="size-5" />
              </span>
              <div>
                <h3 className="text-sm font-semibold">Letter workflow</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Employee and company placeholders are filled automatically from HRMS records.
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-3 text-sm">
              <div className="rounded-xl border bg-background p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Template</p>
                <p className="mt-1 font-medium">{selectedTemplateName}</p>
              </div>
              <div className="rounded-xl border bg-background p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Output</p>
                <p className="mt-1 font-medium">
                  {form.watch("publishNow") ? "Published PDF in Employee Documents" : "Pending approval letter"}
                </p>
              </div>
              <div className="rounded-xl border bg-background p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
                <p className="mt-1 font-medium">Ready to generate</p>
              </div>
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(preview)}
        onOpenChange={(next) => !next && setPreview(null)}
        title={preview?.subject ?? "Letter Preview"}
        description={preview?.letterNumber ?? undefined}
        contentClassName="sm:max-w-4xl"
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
          <div className="rounded-2xl border bg-muted/30 p-4">
            <div className="mx-auto max-w-3xl rounded-xl border bg-background p-8 shadow-sm">
              <div className="mb-6 flex items-start justify-between gap-4 border-b pb-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {LETTER_TYPE_LABELS[preview.letterType]}
                  </p>
                  <h2 className="mt-1 text-xl font-semibold">{preview.subject}</h2>
                </div>
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                  {LETTER_STATUS_LABELS[preview.letterStatus]}
                </span>
              </div>
              <div
                className="prose prose-sm max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: preview.bodyHtml }}
              />
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onOpenChange={(next) => !next && setDeleteTarget(null)}
        title="Delete company letter?"
        description="This removes the letter from Company Letters. Published files can still be managed from Employee Documents."
        footer={
          <Button
            variant="destructive"
            disabled={isPending}
            onClick={() => {
              if (deleteTarget) onDelete(deleteTarget.id);
            }}
          >
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Delete Letter
          </Button>
        }
      >
        {deleteTarget ? (
          <div className="rounded-xl border bg-muted/30 p-4 text-sm">
            <p className="font-medium">{deleteTarget.letterNumber ?? deleteTarget.subject}</p>
            <p className="mt-1 text-muted-foreground">
              {deleteTarget.employeeName} · {LETTER_TYPE_LABELS[deleteTarget.letterType]}
            </p>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
