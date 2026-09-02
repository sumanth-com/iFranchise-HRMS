"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, Eye, FileText, Loader2, Pencil, Plus, Search, Trash2, Upload, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { DataTable, type DataTableColumn } from "@/components/common/data-table";
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
import { Label } from "@/components/ui/label";
import { CompanyAnnouncementIcon, CompanyAnnouncementIconPicker, AUDIENCE_ICONS } from "@/components/organization/company-announcement-icon";
import {
  archiveCompanyAnnouncementAction,
  deleteCompanyAnnouncementAction,
  getAcknowledgementProofAction,
  getAcknowledgementTrackerAction,
  getCompanyAnnouncementDetailAction,
  publishCompanyAnnouncementAction,
  saveCompanyAnnouncementAction,
} from "@/lib/organization/actions/company-announcement-actions";
import {
  COMPANY_ANNOUNCEMENT_ALLOWED_EXTENSIONS,
  COMPANY_ANNOUNCEMENT_AUDIENCE_LABELS,
  COMPANY_ANNOUNCEMENT_CATEGORY_LABELS,
  COMPANY_ANNOUNCEMENT_MAX_BYTES,
  COMPANY_ANNOUNCEMENT_PRIORITY_LABELS,
  COMPANY_ANNOUNCEMENT_STATUS_LABELS,
  canManageCompanyAnnouncements,
  isAllowedAnnouncementFile,
} from "@/lib/organization/company-announcement-constants";
import { getHrmsYearSelectItems } from "@/lib/date/hrms-year";
import { format } from "date-fns";
import type { LookupOption } from "@/types/employee";
import type {
  AcknowledgementProof,
  AcknowledgementTracker,
  CompanyAnnouncementAttachment,
  CompanyAnnouncementIconKey,
  CompanyAnnouncementListItem,
} from "@/types/company-announcement";
import { cn } from "@/lib/utils";

type Props = {
  announcements: CompanyAnnouncementListItem[];
  departments: LookupOption[];
  employees: LookupOption[];
  permissionCodes: string[];
};

const CATEGORY_ITEMS = Object.entries(COMPANY_ANNOUNCEMENT_CATEGORY_LABELS).map(
  ([value, label]) => ({ value, label }),
);
const PRIORITY_ITEMS = Object.entries(COMPANY_ANNOUNCEMENT_PRIORITY_LABELS).map(
  ([value, label]) => ({ value, label }),
);
const AUDIENCE_ITEMS = Object.entries(COMPANY_ANNOUNCEMENT_AUDIENCE_LABELS).map(
  ([value, label]) => ({ value, label }),
);

const MONTH_ITEMS = [
  { value: "all", label: "All months" },
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

function announcementDate(item: CompanyAnnouncementListItem) {
  return item.publishedAt ?? item.publishAt ?? item.updatedAt;
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function statusClass(status: string) {
  if (status === "published") return "bg-emerald-500/10 text-emerald-700";
  if (status === "draft") return "bg-slate-500/10 text-slate-600";
  return "bg-amber-500/10 text-amber-800";
}

function formatWhen(value: string | null) {
  if (!value) return "—";
  try {
    return format(new Date(value), "d MMM yyyy");
  } catch {
    return value;
  }
}

function formatDateTime(value: string | null) {
  if (!value) return "—";
  try {
    return format(new Date(value), "d MMM yyyy, h:mm a");
  } catch {
    return value;
  }
}

export function AnnouncementsManagement({
  announcements,
  departments,
  employees,
  permissionCodes,
}: Props) {
  const router = useRouter();
  const canManage = canManageCompanyAnnouncements(permissionCodes);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<CompanyAnnouncementListItem | null>(null);
  const [tracker, setTracker] = useState<AcknowledgementTracker | null>(null);
  const [trackerStatus, setTrackerStatus] = useState("all");
  const [trackerDate, setTrackerDate] = useState("");
  const [proof, setProof] = useState<AcknowledgementProof | null>(null);
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("general");
  const [priority, setPriority] = useState("normal");
  const [audienceType, setAudienceType] = useState("all_employees");
  const [iconKey, setIconKey] = useState<CompanyAnnouncementIconKey>("megaphone");
  const [departmentIds, setDepartmentIds] = useState<string[]>([]);
  const [employeeIds, setEmployeeIds] = useState<string[]>([]);
  const [requiresAcknowledgement, setRequiresAcknowledgement] = useState(true);
  const [publishAt, setPublishAt] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [expiresAt, setExpiresAt] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<CompanyAnnouncementAttachment[]>([]);
  const [removedAttachmentIds, setRemovedAttachmentIds] = useState<string[]>([]);

  const publishedTypes = useMemo(() => {
    const values = new Set(announcements.map((item) => item.category));
    return [...values];
  }, [announcements]);

  const yearOptions = useMemo(
    () => getHrmsYearSelectItems().map((item) => item.value),
    [],
  );

  const filtered = useMemo(() => {
    return announcements.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (typeFilter !== "all" && item.category !== typeFilter) return false;
      const value = announcementDate(item);
      if (yearFilter !== "all" && value && String(new Date(value).getFullYear()) !== yearFilter) {
        return false;
      }
      if (monthFilter !== "all" && value && String(new Date(value).getMonth() + 1) !== monthFilter) {
        return false;
      }
      if (dateFilter && value && value.slice(0, 10) !== dateFilter) return false;
      const haystack = `${item.title} ${item.shortDescription ?? ""}`.toLowerCase();
      return haystack.includes(query.trim().toLowerCase());
    });
  }, [announcements, query, statusFilter, typeFilter, yearFilter, monthFilter, dateFilter]);

  const trackerRows = useMemo(() => {
    if (!tracker) return [];
    return tracker.rows.filter((row) => {
      if (trackerStatus === "accepted" && row.status !== "acknowledged") return false;
      if (trackerStatus === "pending" && row.status !== "pending") return false;
      if (trackerDate && row.acknowledgedAt && row.acknowledgedAt.slice(0, 10) !== trackerDate) {
        return false;
      }
      if (trackerDate && !row.acknowledgedAt) return false;
      return true;
    });
  }, [tracker, trackerStatus, trackerDate]);

  function resetForm() {
    setEditingId(null);
    setTitle("");
    setShortDescription("");
    setContent("");
    setCategory("general");
    setPriority("normal");
    setAudienceType("all_employees");
    setIconKey("megaphone");
    setDepartmentIds([]);
    setEmployeeIds([]);
    setRequiresAcknowledgement(true);
    setPublishAt(format(new Date(), "yyyy-MM-dd"));
    setExpiresAt("");
    setFiles([]);
    setExistingAttachments([]);
    setRemovedAttachmentIds([]);
  }

  function openCreate() {
    resetForm();
    setFormOpen(true);
  }

  function openEdit(item: CompanyAnnouncementListItem) {
    startTransition(async () => {
      const result = await getCompanyAnnouncementDetailAction(item.id);
      if (!result.success || !result.data) {
        toast.error(result.success ? "Announcement not found." : result.message);
        return;
      }
      const detail = result.data;
      setEditingId(detail.id);
      setTitle(detail.title);
      setShortDescription(detail.shortDescription ?? "");
      setContent(detail.content);
      setCategory(detail.category);
      setPriority(detail.priority);
      setAudienceType(detail.audienceType);
      setIconKey(detail.iconKey);
      setDepartmentIds(detail.departmentIds);
      setEmployeeIds(detail.employeeIds);
      setRequiresAcknowledgement(detail.requiresAcknowledgement);
      setPublishAt(detail.publishAt ?? format(new Date(), "yyyy-MM-dd"));
      setExpiresAt(detail.expiresAt ?? "");
      setFiles([]);
      setExistingAttachments(detail.attachments);
      setRemovedAttachmentIds([]);
      setFormOpen(true);
    });
  }

  function submit(publishNow: boolean) {
    startTransition(async () => {
      const formData = new FormData();
      if (editingId) formData.set("id", editingId);
      formData.set("title", title);
      formData.set("shortDescription", shortDescription);
      formData.set("content", content);
      formData.set("category", category);
      formData.set("priority", priority);
      formData.set("audienceType", audienceType);
      formData.set("iconKey", iconKey);
      formData.set("requiresAcknowledgement", String(requiresAcknowledgement));
      formData.set("publishAt", publishAt);
      formData.set("expiresAt", expiresAt);
      formData.set("publishNow", String(publishNow));
      departmentIds.forEach((id) => formData.append("departmentIds", id));
      employeeIds.forEach((id) => formData.append("employeeIds", id));
      files.forEach((file) => formData.append("attachments", file));
      removedAttachmentIds.forEach((id) => formData.append("removeAttachmentIds", id));
      const result = await saveCompanyAnnouncementAction(formData);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(publishNow ? "Announcement published" : "Announcement saved");
      setFormOpen(false);
      router.refresh();
    });
  }

  const columns: DataTableColumn<CompanyAnnouncementListItem>[] = [
    {
      key: "title",
      header: "Title",
      render: (row) => (
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-r from-blue-600/10 to-violet-600/10 text-violet-700">
            <CompanyAnnouncementIcon iconKey={row.iconKey} className="size-4" />
          </span>
          <div>
            <p className="font-medium">{row.title}</p>
            <p className="text-xs text-muted-foreground">
              {COMPANY_ANNOUNCEMENT_CATEGORY_LABELS[row.category]} · v{row.versionNumber}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "priority",
      header: "Priority",
      render: (row) => COMPANY_ANNOUNCEMENT_PRIORITY_LABELS[row.priority],
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", statusClass(row.status))}>
          {COMPANY_ANNOUNCEMENT_STATUS_LABELS[row.status]}
        </span>
      ),
    },
    {
      key: "publishAt",
      header: "Published",
      render: (row) => formatWhen(row.publishedAt ?? row.publishAt),
    },
    {
      key: "acknowledgedCount",
      header: "Acknowledgements",
      render: (row) =>
        row.requiresAcknowledgement ? `${row.acknowledgedCount} recorded` : "Not required",
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <div className="flex justify-end gap-1">
          {row.requiresAcknowledgement ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              title="Who accepted"
              onClick={() => {
                startTransition(async () => {
                  const result = await getAcknowledgementTrackerAction(row.id);
                  if (!result.success || !result.data) {
                    toast.error(result.success ? "Unable to load acknowledgements." : result.message);
                    return;
                  }
                  setTracker(result.data);
                  setTrackerStatus("all");
                  setTrackerDate("");
                });
              }}
            >
              <Users className="size-4" />
            </Button>
          ) : null}
          {canManage ? (
            <Button type="button" variant="ghost" size="icon-sm" title="Edit" onClick={() => openEdit(row)}>
              <Pencil className="size-4" />
            </Button>
          ) : null}
          {canManage && row.status !== "published" ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              title="Publish"
              onClick={() => {
                startTransition(async () => {
                  const result = await publishCompanyAnnouncementAction(row.id);
                  if (!result.success) {
                    toast.error(result.message);
                    return;
                  }
                  toast.success("Announcement published");
                  router.refresh();
                });
              }}
            >
              <Eye className="size-4" />
            </Button>
          ) : null}
          {canManage && row.status !== "archived" ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              title="Archive"
              onClick={() => {
                startTransition(async () => {
                  const result = await archiveCompanyAnnouncementAction(row.id);
                  if (!result.success) {
                    toast.error(result.message);
                    return;
                  }
                  toast.success("Announcement archived");
                  router.refresh();
                });
              }}
            >
              <Archive className="size-4" />
            </Button>
          ) : null}
          {canManage ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              title="Delete"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => setDeleting(row)}
            >
              <Trash2 className="size-4" />
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Announcements</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create company notices and track employee acknowledgements.
          </p>
        </div>
        {canManage ? (
          <Button type="button" className="gap-1.5" onClick={openCreate}>
            <Plus className="size-4" />
            Create announcement
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[14rem] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search announcements"
            className="pl-9"
          />
        </div>
        <Select
          items={[{ value: "all", label: "All statuses" }, ...Object.entries(COMPANY_ANNOUNCEMENT_STATUS_LABELS).map(([value, label]) => ({ value, label }))]}
          value={statusFilter}
          onValueChange={(value) => value && setStatusFilter(value)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.entries(COMPANY_ANNOUNCEMENT_STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          items={[
            { value: "all", label: "All types" },
            ...publishedTypes.map((value) => ({
              value,
              label: COMPANY_ANNOUNCEMENT_CATEGORY_LABELS[value],
            })),
          ]}
          value={typeFilter}
          onValueChange={(value) => value && setTypeFilter(value)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {publishedTypes.map((value) => (
              <SelectItem key={value} value={value}>
                {COMPANY_ANNOUNCEMENT_CATEGORY_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          items={[{ value: "all", label: "All years" }, ...yearOptions.map((value) => ({ value, label: value }))]}
          value={yearFilter}
          onValueChange={(value) => value && setYearFilter(value)}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All years</SelectItem>
            {yearOptions.map((value) => (
              <SelectItem key={value} value={value}>
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          items={MONTH_ITEMS}
          value={monthFilter}
          onValueChange={(value) => value && setMonthFilter(value)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent>
            {MONTH_ITEMS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={dateFilter}
          onChange={(event) => setDateFilter(event.target.value)}
          className="w-40"
          aria-label="Filter by date"
        />
      </div>

      <section className="rounded-xl border bg-card p-4 shadow-sm">
        {filtered.length === 0 ? (
          <EmptyState title="No announcements" description="Create a notice to share with employees." />
        ) : (
          <DataTable columns={columns} data={filtered} />
        )}
      </section>

      <Modal
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editingId ? "Edit announcement" : "Create announcement"}
        description="Share a company communication. Published mandatory notices require acknowledgement."
        contentClassName="sm:max-w-2xl"
        showCancel={false}
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="button" variant="secondary" disabled={isPending} onClick={() => submit(false)}>
              Save draft
            </Button>
            <Button type="button" disabled={isPending} onClick={() => submit(true)}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Publish
            </Button>
          </div>
        }
      >
        <div className="grid gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="announcement-title">Announcement title *</Label>
            <Input id="announcement-title" value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="announcement-short">Short description</Label>
            <Input
              id="announcement-short"
              value={shortDescription}
              onChange={(event) => setShortDescription(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="announcement-content">Full announcement content *</Label>
            <textarea
              id="announcement-content"
              rows={7}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              className="min-h-32 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select items={CATEGORY_ITEMS} value={category} onValueChange={(value) => value && setCategory(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_ITEMS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select items={PRIORITY_ITEMS} value={priority} onValueChange={(value) => value && setPriority(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_ITEMS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="publish-at">Publish date</Label>
              <Input id="publish-at" type="date" value={publishAt} onChange={(event) => setPublishAt(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expires-at">Expiry date</Label>
              <Input id="expires-at" type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Audience</Label>
              <Select
                items={AUDIENCE_ITEMS}
                value={audienceType}
                onValueChange={(value) => value && setAudienceType(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AUDIENCE_ITEMS.map((item) => {
                    const Icon = AUDIENCE_ICONS[item.value] ?? AUDIENCE_ICONS.all_employees;
                    return (
                      <SelectItem key={item.value} value={item.value}>
                        <span className="flex items-center gap-2">
                          <Icon className="size-4 text-violet-600" />
                          {item.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Icon</Label>
              <CompanyAnnouncementIconPicker value={iconKey} onChange={setIconKey} />
            </div>
          </div>
          {audienceType === "department" ? (
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border p-2">
              {departments.map((dept) => (
                <label key={dept.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={departmentIds.includes(dept.id)}
                    onChange={(event) => {
                      setDepartmentIds((current) =>
                        event.target.checked
                          ? [...current, dept.id]
                          : current.filter((id) => id !== dept.id),
                      );
                    }}
                  />
                  {dept.label}
                </label>
              ))}
            </div>
          ) : null}
          {audienceType === "employees" ? (
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border p-2">
              {employees.map((person) => (
                <label key={person.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={employeeIds.includes(person.id)}
                    onChange={(event) => {
                      setEmployeeIds((current) =>
                        event.target.checked
                          ? [...current, person.id]
                          : current.filter((id) => id !== person.id),
                      );
                    }}
                  />
                  {person.label}
                  {person.code ? <span className="text-xs text-muted-foreground">({person.code})</span> : null}
                </label>
              ))}
            </div>
          ) : null}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={requiresAcknowledgement}
              onChange={(event) => setRequiresAcknowledgement(event.target.checked)}
            />
            Requires acknowledgement
          </label>
          <div className="space-y-2">
            <Label>Attachments</Label>
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed bg-muted/20 px-4 py-3">
              <span className="flex items-center gap-2 text-sm font-medium">
                <Upload className="size-4 text-muted-foreground" />
                Upload PDF or document
              </span>
              <span className="text-xs text-muted-foreground">PDF, Word, or image · 10 MB max</span>
              <input
                type="file"
                multiple
                accept={COMPANY_ANNOUNCEMENT_ALLOWED_EXTENSIONS.join(",")}
                className="sr-only"
                onChange={(event) => {
                  const incoming = Array.from(event.target.files ?? []);
                  setFiles((current) => {
                    const next = [...current];
                    for (const file of incoming) {
                      if (!isAllowedAnnouncementFile(file)) {
                        toast.error(`${file.name} is not a supported file type.`);
                        continue;
                      }
                      if (file.size > COMPANY_ANNOUNCEMENT_MAX_BYTES) {
                        toast.error(`${file.name} exceeds the 10 MB limit.`);
                        continue;
                      }
                      if (!next.some((item) => item.name === file.name && item.size === file.size)) {
                        next.push(file);
                      }
                    }
                    return next;
                  });
                  event.target.value = "";
                }}
              />
            </label>
            {existingAttachments.length > 0 || files.length > 0 ? (
              <ul className="space-y-2">
                {existingAttachments.map((file) => (
                  <li
                    key={file.id}
                    className="flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2"
                  >
                    <span className="flex min-w-0 items-center gap-2 text-sm">
                      <FileText className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{file.fileName}</span>
                      {file.fileSize ? (
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {formatFileSize(file.fileSize)}
                        </span>
                      ) : null}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      title="Remove attachment"
                      onClick={() => {
                        setExistingAttachments((current) => current.filter((item) => item.id !== file.id));
                        setRemovedAttachmentIds((current) =>
                          current.includes(file.id) ? current : [...current, file.id],
                        );
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                ))}
                {files.map((file, index) => (
                  <li
                    key={`${file.name}-${file.size}-${index}`}
                    className="flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2"
                  >
                    <span className="flex min-w-0 items-center gap-2 text-sm">
                      <FileText className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{file.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </span>
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      title="Remove attachment"
                      onClick={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">No files attached yet.</p>
            )}
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(tracker)}
        onOpenChange={(open) => {
          if (!open) setTracker(null);
        }}
        title="Accepted employees"
        description={tracker ? `${tracker.title} · employees who accepted this notice` : undefined}
        contentClassName="sm:max-w-3xl"
        showCancel={false}
        footer={
          <Button type="button" variant="outline" onClick={() => setTracker(null)}>
            Close
          </Button>
        }
      >
        {tracker ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-4">
              <SummaryStat label="Total employees" value={tracker.total} />
              <SummaryStat label="Accepted" value={tracker.acknowledged} />
              <SummaryStat label="Pending" value={tracker.pending} />
              <SummaryStat label="Completion" value={`${tracker.completionPercent}%`} />
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-600 to-violet-600"
                style={{ width: `${tracker.completionPercent}%` }}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                items={[
                  { value: "all", label: "All employees" },
                  { value: "accepted", label: "Accepted" },
                  { value: "pending", label: "Pending" },
                ]}
                value={trackerStatus}
                onValueChange={(value) => value && setTrackerStatus(value)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Acceptance" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All employees</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={trackerDate}
                onChange={(event) => setTrackerDate(event.target.value)}
                className="w-40"
                aria-label="Filter accepted date"
              />
            </div>
            <DataTable
              columns={[
                { key: "employeeName", header: "Employee", render: (row) => row.employeeName },
                { key: "employeeCode", header: "Employee ID", render: (row) => row.employeeCode },
                { key: "departmentName", header: "Department", render: (row) => row.departmentName || "—" },
                {
                  key: "status",
                  header: "Status",
                  render: (row) => (
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                        row.status === "acknowledged"
                          ? "bg-emerald-500/10 text-emerald-700"
                          : "bg-slate-500/10 text-slate-600",
                      )}
                    >
                      {row.status === "acknowledged" ? "Accepted" : "Pending"}
                    </span>
                  ),
                },
                {
                  key: "acknowledgedAt",
                  header: "Accepted on",
                  render: (row) =>
                    row.acknowledgedAt ? (
                      <button
                        type="button"
                        className="text-left text-xs font-medium text-primary hover:underline"
                        onClick={() => {
                          if (!row.acknowledgementId) return;
                          startTransition(async () => {
                            const result = await getAcknowledgementProofAction(row.acknowledgementId!);
                            if (!result.success || !result.data) {
                              toast.error(result.success ? "Proof not found." : result.message);
                              return;
                            }
                            setProof(result.data);
                          });
                        }}
                      >
                        {formatDateTime(row.acknowledgedAt)}
                      </button>
                    ) : (
                      "—"
                    ),
                },
              ]}
              data={trackerRows}
            />
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(proof)}
        onOpenChange={(open) => {
          if (!open) setProof(null);
        }}
        title="Acknowledgement details"
        showCancel={false}
        footer={
          <Button type="button" variant="outline" onClick={() => setProof(null)}>
            Close
          </Button>
        }
      >
        {proof ? (
          <dl className="space-y-3 text-sm">
            <ProofRow label="Announcement" value={proof.announcementTitle} />
            <ProofRow label="Employee" value={proof.employeeName} />
            <ProofRow label="Employee ID" value={proof.employeeCode} />
            <ProofRow label="Status" value="Accepted" />
            <ProofRow label="Accepted on" value={formatDateTime(proof.acknowledgedAt)} />
            <ProofRow label="Version" value={proof.versionLabel} />
            {proof.ipAddress ? <ProofRow label="IP address" value={proof.ipAddress} /> : null}
          </dl>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Delete announcement?"
        description="If this notice already has acknowledgement records, archive it instead of deleting."
        showCancel={false}
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isPending}
              onClick={() => {
                if (!deleting) return;
                startTransition(async () => {
                  const result = await deleteCompanyAnnouncementAction(deleting.id);
                  if (!result.success) {
                    toast.error(result.message);
                    return;
                  }
                  toast.success("Announcement deleted");
                  setDeleting(null);
                  router.refresh();
                });
              }}
            >
              Delete
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">{deleting?.title}</p>
      </Modal>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border bg-muted/20 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function ProofRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
