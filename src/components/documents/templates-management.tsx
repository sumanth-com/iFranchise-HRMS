"use client";

import { format } from "date-fns";
import {
  Eye,
  FilePenLine,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
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
import { LabeledSelect } from "@/components/payroll/payroll-select";
import {
  deleteTemplateAction,
  saveTemplateAction,
} from "@/lib/documents/actions";
import {
  LETTER_TYPE_LABELS,
  LETTER_TYPE_OPTIONS,
  TEMPLATE_PLACEHOLDERS,
  canManageTemplates,
} from "@/lib/documents/constants";
import {
  templateFormSchema,
  type TemplateFormValues,
} from "@/lib/validations/documents";
import type { TemplateItem } from "@/types/documents";

type TemplateFormInput = {
  name: string;
  letterType: TemplateFormValues["letterType"];
  documentTypeCode: string;
  subject: string;
  bodyHtml: string;
  isDefault: boolean;
};

type Props = {
  templates: TemplateItem[];
  permissionCodes: string[];
};

const SAMPLE_PLACEHOLDERS: Record<(typeof TEMPLATE_PLACEHOLDERS)[number], string> = {
  employeeName: "Aarav Sharma",
  employeeCode: "IF2026012",
  designation: "Senior HR Executive",
  department: "Human Resources",
  joiningDate: "15 Jul 2026",
  salary: "As per company policy",
  companyName: "iFranchise HRMS",
  manager: "HR Manager",
  currentDate: "13 Jul 2026",
};

const PLACEHOLDER_LABELS: Record<(typeof TEMPLATE_PLACEHOLDERS)[number], string> = {
  employeeName: "Employee Name",
  employeeCode: "Employee Code",
  designation: "Designation",
  department: "Department",
  joiningDate: "Joining Date",
  salary: "Salary",
  companyName: "Company Name",
  manager: "Reporting Manager",
  currentDate: "Current Date",
};

function placeholderMarker(placeholder: (typeof TEMPLATE_PLACEHOLDERS)[number]) {
  return `[${PLACEHOLDER_LABELS[placeholder]}]`;
}

const GENERAL_STARTER_BODY = `Dear [Employee Name],

We are pleased to share this official communication from [Company Name] regarding your role as [Designation] in the [Department] department.

Your contribution, professionalism, and commitment continue to support our shared growth. Please treat this letter as a formal record for your employment documentation.

We wish you continued success and a meaningful journey with [Company Name].

Warm regards,
[Reporting Manager]
[Company Name]
[Current Date]`;

const TEMPLATE_STARTERS: Record<
  TemplateFormInput["letterType"],
  { name: string; subject: string; body: string }
> = {
  offer_letter: {
    name: "Default Offer Letter",
    subject: "Offer Letter",
    body: `Dear [Employee Name],

We are pleased to offer you the position of [Designation] in the [Department] department at [Company Name].

Your compensation and employment terms will be shared as per the approved offer details. We look forward to welcoming you to the team and building a successful journey together.

Warm regards,
[Reporting Manager]
[Company Name]
[Current Date]`,
  },
  appointment_letter: {
    name: "Default Appointment Letter",
    subject: "Appointment Letter",
    body: `Dear [Employee Name],

Congratulations. You are hereby appointed as [Designation] in [Department] effective [Joining Date].

Employee Code: [Employee Code]
Reporting Manager: [Reporting Manager]

We welcome you to [Company Name] and wish you success in your role.

Regards,
[Department]
[Company Name]
[Current Date]`,
  },
  confirmation_letter: {
    name: "Default Confirmation Letter",
    subject: "Confirmation Letter",
    body: `Dear [Employee Name],

We are pleased to confirm your employment with [Company Name] as [Designation] in the [Department] department.

Your performance and commitment during the review period have been appreciated. We look forward to your continued contribution.

Regards,
[Reporting Manager]
[Company Name]
[Current Date]`,
  },
  promotion_letter: {
    name: "Default Promotion Letter",
    subject: "Promotion Letter",
    body: `Dear [Employee Name],

Congratulations. We are pleased to promote you to [Designation] in the [Department] department at [Company Name].

This promotion recognizes your dedication, ownership, and consistent contribution to the organization. We wish you continued success in your new responsibilities.

Regards,
[Reporting Manager]
[Company Name]
[Current Date]`,
  },
  salary_revision_letter: {
    name: "Default Salary Revision Letter",
    subject: "Salary Revision Letter",
    body: `Dear [Employee Name],

We are pleased to inform you that your salary has been revised to [Salary] based on the applicable company policy and approval process.

We appreciate your contribution to [Company Name] and look forward to your continued performance.

Regards,
[Reporting Manager]
[Company Name]
[Current Date]`,
  },
  warning_letter: {
    name: "Default Warning Letter",
    subject: "Warning Letter",
    body: `Dear [Employee Name],

This letter is issued as an official warning from [Company Name] regarding conduct or performance concerns discussed with you.

You are expected to take corrective action immediately and maintain the standards required for your role as [Designation] in [Department].

Regards,
[Reporting Manager]
[Company Name]
[Current Date]`,
  },
  appreciation_letter: {
    name: "Default Appreciation Letter",
    subject: "Appreciation Letter",
    body: `Dear [Employee Name],

We sincerely appreciate your valuable contribution as [Designation] in the [Department] department.

Your dedication and positive impact are recognized by [Company Name]. Thank you for your continued commitment.

Regards,
[Reporting Manager]
[Company Name]
[Current Date]`,
  },
  experience_letter: {
    name: "Default Experience Letter",
    subject: "Experience Letter",
    body: `To whom it may concern,

This is to certify that [Employee Name], Employee Code [Employee Code], has been associated with [Company Name] as [Designation] in the [Department] department.

We thank [Employee Name] for the service and wish continued success in future endeavors.

Regards,
[Reporting Manager]
[Company Name]
[Current Date]`,
  },
  relieving_letter: {
    name: "Default Relieving Letter",
    subject: "Relieving Letter",
    body: `Dear [Employee Name],

This is to confirm that you have been relieved from your duties at [Company Name] after completing the required exit formalities.

We appreciate your contribution as [Designation] in [Department] and wish you success ahead.

Regards,
[Reporting Manager]
[Company Name]
[Current Date]`,
  },
  termination_letter: {
    name: "Default Termination Letter",
    subject: "Termination Letter",
    body: `Dear [Employee Name],

This letter confirms the termination of your employment with [Company Name] as per the applicable company process and communicated terms.

Please complete all handover and exit formalities with [Department].

Regards,
[Reporting Manager]
[Company Name]
[Current Date]`,
  },
  resignation_acceptance_letter: {
    name: "Default Resignation Acceptance Letter",
    subject: "Acceptance of Resignation",
    body: `Dear [Employee Name],

This is to confirm that your resignation from [Company Name] has been accepted.

Please complete the required handover and exit formalities with your reporting manager, [Reporting Manager].

Regards,
[Company Name]
[Current Date]`,
  },
  settlement_letter: {
    name: "Default Final Settlement Letter",
    subject: "Final Settlement Letter",
    body: `Dear [Employee Name],

This letter confirms that the final settlement process for your employment with [Company Name] has been initiated as per company policy.

Please coordinate with the HR department for any remaining documentation or clarifications.

Regards,
[Reporting Manager]
[Company Name]
[Current Date]`,
  },
};

function getStarter(letterType: TemplateFormInput["letterType"]) {
  return TEMPLATE_STARTERS[letterType] ?? {
    name: `${LETTER_TYPE_LABELS[letterType]} Template`,
    subject: LETTER_TYPE_LABELS[letterType],
    body: GENERAL_STARTER_BODY,
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function editableTextToHtml(text: string) {
  return markersToTokens(text)
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replaceAll("\n", "<br/>")}</p>`)
    .join("");
}

function htmlToEditableText(html: string) {
  const text = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .trim();

  return tokensToMarkers(text);
}

function renderPreviewHtml(html: string) {
  return markersToTokens(html).replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    return SAMPLE_PLACEHOLDERS[key as keyof typeof SAMPLE_PLACEHOLDERS] ?? `{{${key}}}`;
  });
}

function tokensToMarkers(text: string) {
  return TEMPLATE_PLACEHOLDERS.reduce(
    (next, placeholder) =>
      next.replaceAll(`{{${placeholder}}}`, placeholderMarker(placeholder)),
    text,
  );
}

function markersToTokens(text: string) {
  return TEMPLATE_PLACEHOLDERS.reduce(
    (next, placeholder) =>
      next.replaceAll(placeholderMarker(placeholder), `{{${placeholder}}}`),
    text,
  );
}

export function TemplatesManagement({ templates, permissionCodes }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TemplateItem | null>(null);
  const [preview, setPreview] = useState<TemplateItem | null>(null);
  const canManage = canManageTemplates(permissionCodes);

  const form = useForm<TemplateFormInput>({
    resolver: zodResolver(templateFormSchema) as never,
    defaultValues: {
      name: "",
      letterType: "offer_letter",
      documentTypeCode: "OFFER_LETTER",
      subject: "",
      bodyHtml: "",
      isDefault: false,
    },
  });

  const openCreate = useCallback(() => {
    const starter = getStarter("offer_letter");
    setEditing(null);
    form.reset({
      name: starter.name,
      letterType: "offer_letter",
      documentTypeCode: "OFFER_LETTER",
      subject: starter.subject,
      bodyHtml: starter.body,
      isDefault: false,
    });
    setOpen(true);
  }, [form]);

  const openEdit = useCallback(
    (item: TemplateItem) => {
      setEditing(item);
      form.reset({
        name: item.name,
        letterType: item.letterType,
        documentTypeCode: item.documentTypeCode,
        subject: item.subject ?? "",
        bodyHtml: htmlToEditableText(item.bodyHtml),
        isDefault: item.isDefault,
      });
      setOpen(true);
    },
    [form],
  );

  function onSave(values: TemplateFormInput) {
    startTransition(async () => {
      const result = await saveTemplateAction(
        {
          ...values,
          bodyHtml: editableTextToHtml(values.bodyHtml),
        },
        editing?.id,
      );
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(editing ? "Template updated" : "Template created");
      setOpen(false);
      router.refresh();
    });
  }

  function insertPlaceholder(placeholder: (typeof TEMPLATE_PLACEHOLDERS)[number]) {
    const current = form.getValues("bodyHtml") || "";
    form.setValue(
      "bodyHtml",
      `${current}${current.endsWith(" ") || current.endsWith("\n") ? "" : " "}${placeholderMarker(placeholder)}`,
      {
        shouldDirty: true,
        shouldValidate: true,
      },
    );
  }

  function applyStarter(letterType: TemplateFormInput["letterType"]) {
    const starter = getStarter(letterType);
    form.setValue("name", starter.name, { shouldDirty: true });
    form.setValue("subject", starter.subject, { shouldDirty: true });
    form.setValue("bodyHtml", starter.body, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  const onDelete = useCallback(
    (id: string) => {
      startTransition(async () => {
        const result = await deleteTemplateAction(id);
        if (!result.success) {
          toast.error(result.message);
          return;
        }
        toast.success("Template deleted");
        router.refresh();
      });
    },
    [router],
  );

  const columns = useMemo<DataTableColumn<TemplateItem & Record<string, unknown>>[]>(
    () => [
      {
        key: "name",
        header: "Template",
        render: (row) => (
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FilePenLine className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-medium">{row.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {row.subject ? tokensToMarkers(row.subject) : "Professional HR letter format"}
              </p>
            </div>
          </div>
        ),
      },
      {
        key: "letterType",
        header: "Letter Type",
        render: (row) => LETTER_TYPE_LABELS[row.letterType],
      },
      {
        key: "isDefault",
        header: "Default",
        render: (row) =>
          row.isDefault ? (
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700">
              Default
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">Custom</span>
          ),
      },
      {
        key: "updatedAt",
        header: "Updated",
        render: (row) => format(new Date(row.updatedAt), "dd MMM yyyy"),
      },
      {
        key: "actions",
        header: "Actions",
        render: (row) => (
          <div className="flex gap-1">
            <Button size="icon-sm" variant="ghost" onClick={() => setPreview(row)}>
              <Eye className="h-4 w-4" />
            </Button>
            {canManage ? (
              <>
                <Button size="icon-sm" variant="ghost" onClick={() => openEdit(row)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon-sm" variant="ghost" onClick={() => onDelete(row.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </>
            ) : null}
          </div>
        ),
      },
    ],
    [canManage, onDelete, openEdit],
  );

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Templates</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create polished letter templates with live preview, placeholders, and quick editing.
          </p>
        </div>
        {canManage ? (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            New Template
          </Button>
        ) : null}
      </div>

      {templates.length === 0 ? (
        <EmptyState title="No templates" description="Create a letter template to get started." />
      ) : (
        <DataTable columns={columns} data={templates} />
      )}

      <Modal
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit Template" : "Create Template"}
        description="Edit the content on the left and review the final letter preview on the right."
        contentClassName="sm:max-w-6xl"
        footer={
          <Button onClick={form.handleSubmit(onSave)} disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Template
          </Button>
        }
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.9fr)]">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input placeholder="Default Appointment Letter" {...form.register("name")} />
              </div>
              <div className="space-y-2">
                <Label>Letter Type</Label>
                <LabeledSelect
                  items={LETTER_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                  value={form.watch("letterType")}
                  onValueChange={(value) => {
                    const meta = LETTER_TYPE_OPTIONS.find((o) => o.value === value);
                    const nextLetterType = value as TemplateFormInput["letterType"];
                    form.setValue("letterType", nextLetterType, {
                      shouldDirty: true,
                    });
                    if (meta) form.setValue("documentTypeCode", meta.documentTypeCode);
                    applyStarter(nextLetterType);
                  }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                placeholder="Appointment Letter"
                {...form.register("subject")}
              />
            </div>
            <div className="rounded-2xl border bg-muted/30 p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <Label>Quick placeholders</Label>
                  <p className="text-xs text-muted-foreground">
                    Click a chip when you want HRMS to auto-fill that value.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    applyStarter(form.getValues("letterType"))
                  }
                >
                  Use starter
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {TEMPLATE_PLACEHOLDERS.map((p) => (
                  <Button
                    key={p}
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 rounded-full px-2 text-xs"
                    onClick={() => insertPlaceholder(p)}
                  >
                    {PLACEHOLDER_LABELS[p]}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Letter Content</Label>
              <textarea
                className="min-h-72 w-full rounded-xl border bg-background px-3 py-2 text-sm leading-6 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                placeholder="Write the letter like a normal email. Example: Dear [Employee Name],"
                {...form.register("bodyHtml")}
              />
              <p className="text-xs text-muted-foreground">
                No coding needed. Write normal text and use placeholder chips for employee/company details.
              </p>
            </div>
            <label className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2 text-sm">
              <input
                type="checkbox"
                className="size-4 rounded border-input"
                checked={Boolean(form.watch("isDefault"))}
                onChange={(e) => form.setValue("isDefault", e.target.checked)}
              />
              Set as default for this letter type
            </label>
          </div>

          <div className="rounded-2xl border bg-muted/30 p-3">
            <div className="mb-3 rounded-xl border bg-background p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Live preview</p>
              <h3 className="mt-1 line-clamp-2 text-sm font-semibold">
                {renderPreviewHtml(form.watch("subject") || LETTER_TYPE_LABELS[form.watch("letterType")])}
              </h3>
            </div>
            <div className="max-h-[34rem] overflow-y-auto rounded-xl border bg-background p-5 shadow-sm">
              <div
                className="prose prose-sm max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{
                  __html: renderPreviewHtml(editableTextToHtml(form.watch("bodyHtml") || "")),
                }}
              />
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(preview)}
        onOpenChange={(next) => !next && setPreview(null)}
        title={preview?.name ?? "Preview"}
        contentClassName="sm:max-w-4xl"
      >
        {preview ? (
          <div className="rounded-2xl border bg-muted/30 p-4">
            <div className="mx-auto max-w-3xl rounded-xl border bg-background p-8 shadow-sm">
              <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                {LETTER_TYPE_LABELS[preview.letterType]}
              </p>
              {preview.subject ? (
                <h2 className="mb-6 text-xl font-semibold">{renderPreviewHtml(preview.subject)}</h2>
              ) : null}
              <div
                className="prose prose-sm max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: renderPreviewHtml(preview.bodyHtml) }}
              />
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
