"use client";

import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Mail,
  MapPin,
  User,
} from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { OnboardingDocumentsPanel } from "@/components/onboarding/hr/onboarding-documents-panel";
import { Input } from "@/components/common/input";
import { LabeledSelect } from "@/components/payroll/payroll-select";
import type { SelectItemOption } from "@/components/payroll/select-utils";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  archiveOnboardingAction,
  cancelOnboardingAction,
  fetchOnboardingDetailAction,
  processOnboardingReviewAction,
  resendOnboardingInvitationAction,
  reviewDocumentAction,
} from "@/lib/onboarding/actions/hr-onboarding-actions";
import { useSetBreadcrumbLabel } from "@/providers/breadcrumb-label-provider";
import {
  ONBOARDING_ROUTES,
  ONBOARDING_STATUS_LABELS,
  ONBOARDING_WIZARD_SECTIONS,
  type OnboardingStatus,
} from "@/types/onboarding";
import type { OnboardingCaseDetail } from "@/types/onboarding";

type OnboardingReviewViewProps = {
  detail: OnboardingCaseDetail;
  roles: { id: string; name: string; code: string }[];
  readOnly?: boolean;
  listHref?: string;
};

const SECTION_LABELS: Record<string, string> = {
  personal: "Personal information",
  identity: "Identity documents",
  education: "Education",
  employment_history: "Previous employment",
  bank: "Bank details",
  terms: "Terms & conditions",
  signature: "Electronic signature",
};

function statusBadgeClass(status: OnboardingStatus) {
  if (status === "pending_hr_review") return "bg-amber-100 text-amber-900 border-amber-200";
  if (status === "employee_created" || status === "completed")
    return "bg-emerald-100 text-emerald-900 border-emerald-200";
  if (status === "rejected" || status === "cancelled")
    return "bg-red-100 text-red-900 border-red-200";
  if (status === "corrections_requested")
    return "bg-orange-100 text-orange-900 border-orange-200";
  if (status === "invitation_sent" || status === "invitation_viewed")
    return "bg-blue-100 text-blue-900 border-blue-200";
  if (status === "in_progress" || status === "documents_uploaded")
    return "bg-violet-100 text-violet-900 border-violet-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function OnboardingReviewView({
  detail: initialDetail,
  roles,
  readOnly = false,
  listHref = ONBOARDING_ROUTES.hrList,
}: OnboardingReviewViewProps) {
  const router = useRouter();
  const [detail, setDetail] = useState(initialDetail);
  const [hrComments, setHrComments] = useState("");
  const [correctionNotes, setCorrectionNotes] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [intendedRoleId, setIntendedRoleId] = useState(initialDetail.intendedRoleId);
  const [isResending, setIsResending] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  useSetBreadcrumbLabel(detail.fullName);

  const roleItems: SelectItemOption[] = roles.map((r) => ({ value: r.id, label: r.name }));

  const completedSections = ONBOARDING_WIZARD_SECTIONS.filter((key) =>
    detail.sections.some((s) => s.sectionKey === key && s.completedAt),
  ).length;

  const canReview = !readOnly && detail.status === "pending_hr_review";
  const cannotCancel =
    detail.status === "cancelled" ||
    detail.status === "archived" ||
    detail.status === "rejected" ||
    detail.status === "employee_created" ||
    detail.status === "completed";
  const canResendInvite = [
    "draft",
    "invitation_sent",
    "invitation_viewed",
    "in_progress",
    "documents_uploaded",
    "corrections_requested",
    "cancelled",
  ].includes(detail.status);

  function refresh() {
    startTransition(async () => {
      const next = await fetchOnboardingDetailAction(detail.id);
      setDetail(next);
      router.refresh();
    });
  }

  function reviewDocument(
    documentId: string,
    reviewStatus: "approved" | "rejected" | "correction_requested",
  ) {
    startTransition(async () => {
      const result = await reviewDocumentAction({ documentId, reviewStatus });
      if (!result.success) toast.error(result.message);
      else {
        toast.success(result.message);
        refresh();
      }
    });
  }

  function processReview(action: "approve" | "reject" | "request_corrections") {
    startTransition(async () => {
      const result = await processOnboardingReviewAction({
        caseId: detail.id,
        action,
        hrComments: hrComments || null,
        correctionNotes: correctionNotes || null,
        intendedRoleId: action === "approve" ? intendedRoleId : null,
        companyEmail: action === "approve" ? companyEmail.trim() : null,
      });
      if (!result.success) toast.error(result.message);
      else {
        toast.success(result.message);
        refresh();
      }
    });
  }

  function resendInvite() {
    setIsResending(true);
    startTransition(async () => {
      try {
        const result = await resendOnboardingInvitationAction(detail.id);
        if (!result.success) {
          toast.error(result.message);
          return;
        }
        toast.success(result.message);
        if (result.detail) {
          setDetail(result.detail);
        } else {
          refresh();
        }
      } finally {
        setIsResending(false);
      }
    });
  }

  function cancelCase() {
    startTransition(async () => {
      const result = await cancelOnboardingAction(detail.id);
      toast[result.success ? "success" : "error"](result.message);
      if (result.success) {
        setCancelDialogOpen(false);
        refresh();
      }
    });
  }

  function archiveCase() {
    startTransition(async () => {
      const result = await archiveOnboardingAction(detail.id);
      toast[result.success ? "success" : "error"](result.message);
      if (result.success) refresh();
    });
  }

  return (
    <>
      <div className="space-y-6">
          <div className="space-y-4">
            <Button
              variant="ghost"
              size="sm"
              className="-ml-2"
              onClick={() => router.push(listHref)}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to list
            </Button>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl font-semibold tracking-tight capitalize">
                    {detail.fullName}
                  </h1>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(detail.status)}`}
                  >
                    {ONBOARDING_STATUS_LABELS[detail.status]}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{detail.personalEmail}</p>
                {detail.mobileNumber ? (
                  <p className="text-sm text-muted-foreground">{detail.mobileNumber}</p>
                ) : null}
              </div>

              {readOnly ? null : (
              <div className="flex flex-wrap gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resendInvite}
                  disabled={isResending || !canResendInvite}
                >
                  {isResending ? (
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4 mr-1.5" />
                  )}
                  Resend invitation
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCancelDialogOpen(true)}
                  disabled={isPending || cannotCancel}
                >
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={archiveCase}
                  disabled={isPending || detail.status === "archived"}
                >
                  Archive
                </Button>
              </div>
              )}
            </div>
          </div>
          {detail.status === "cancelled" ? (
            <div className="rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-950">
              <strong>Onboarding cancelled.</strong> The candidate cannot access the portal. Use
              &quot;Resend invitation&quot; to reopen onboarding and send a new link.
            </div>
          ) : null}

          {detail.status === "draft" && !detail.invitationSentAt ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
              <strong>Invitation not sent yet.</strong> Use &quot;Resend invitation&quot; to email
              the candidate their secure onboarding link.
            </div>
          ) : null}

          {detail.invitationSentAt ? (
            <div className="rounded-xl border bg-muted/30 px-4 py-3 text-sm">
              <span className="font-medium">Invitation sent</span>
              <span className="text-muted-foreground">
                {" "}
                · {formatDateTime(detail.invitationSentAt)}
              </span>
              {detail.submittedAt ? (
                <span className="text-muted-foreground">
                  {" "}
                  · Submitted {formatDateTime(detail.submittedAt)}
                </span>
              ) : null}
            </div>
          ) : null}

          {detail.companyEmail ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
              <CheckCircle2 className="inline h-4 w-4 mr-1.5 align-text-bottom" />
              <strong>Employee created:</strong> {detail.employeeCode} · {detail.companyEmail}
            </div>
          ) : null}

          {detail.correctionNotes ? (
            <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-950">
              <strong>Correction notes:</strong> {detail.correctionNotes}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Progress
              </p>
              <p className="mt-1 text-2xl font-semibold">{detail.completionPercent}%</p>
              <div className="mt-2 h-1.5 rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${detail.completionPercent}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {completedSections} of {ONBOARDING_WIZARD_SECTIONS.length} sections
              </p>
            </div>
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Portal role
              </p>
              <p className="mt-1 flex items-center gap-2 text-lg font-medium">
                <User className="h-4 w-4 text-muted-foreground" />
                {detail.intendedRoleName}
              </p>
            </div>
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Documents
              </p>
              <p className="mt-1 flex items-center gap-2 text-lg font-medium">
                <FileText className="h-4 w-4 text-muted-foreground" />
                {detail.documents.length} uploaded
              </p>
            </div>
          </div>

          <section className="rounded-xl border bg-card p-5 shadow-sm">
            <h2 className="text-center text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Assignment details
            </h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex gap-3">
                <Briefcase className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <dt className="text-xs text-muted-foreground">Designation</dt>
                  <dd className="font-medium">{detail.designationName ?? "—"}</dd>
                </div>
              </div>
              <div className="flex gap-3">
                <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <dt className="text-xs text-muted-foreground">Department</dt>
                  <dd className="font-medium">{detail.departmentName ?? "—"}</dd>
                </div>
              </div>
              <div className="flex gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <dt className="text-xs text-muted-foreground">Work location</dt>
                  <dd className="font-medium">{detail.workLocationName ?? "—"}</dd>
                </div>
              </div>
              <div className="flex gap-3">
                <User className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <dt className="text-xs text-muted-foreground">Reporting manager</dt>
                  <dd className="font-medium">{detail.reportingManagerName ?? "—"}</dd>
                </div>
              </div>
              <div className="flex gap-3">
                <Briefcase className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <dt className="text-xs text-muted-foreground">Employment type</dt>
                  <dd className="font-medium">{detail.employmentTypeName ?? "—"}</dd>
                </div>
              </div>
              <div className="flex gap-3">
                <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <dt className="text-xs text-muted-foreground">Branch</dt>
                  <dd className="font-medium">{detail.branchName ?? "—"}</dd>
                </div>
              </div>
            </dl>
          </section>

          <section className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-center font-semibold">Onboarding checklist</h2>
              <span className="text-xs text-muted-foreground">
                {completedSections}/{ONBOARDING_WIZARD_SECTIONS.length} complete
              </span>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {ONBOARDING_WIZARD_SECTIONS.map((key) => {
                const section = detail.sections.find((s) => s.sectionKey === key);
                const done = Boolean(section?.completedAt);
                return (
                  <div
                    key={key}
                    className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm ${
                      done ? "border-emerald-200 bg-emerald-50/50" : "bg-muted/20"
                    }`}
                  >
                    {done ? (
                      <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                    ) : (
                      <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <span>{SECTION_LABELS[key] ?? key}</span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-xl border bg-card p-5 shadow-sm">
            <h2 className="text-center font-semibold">Documents</h2>
            <div className="mt-4">
              <OnboardingDocumentsPanel
                documents={detail.documents}
                educationSectionData={
                  detail.sections.find((s) => s.sectionKey === "education")?.data
                }
                canReview={canReview}
                isPending={isPending}
                onReview={reviewDocument}
              />
            </div>
          </section>

          {canReview ? (
            <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
              <div className="border-b bg-muted/30 px-6 py-5 text-center">
                <h2 className="text-base font-semibold tracking-tight">
                  HR review & portal activation
                </h2>
                <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                  Enter the official company email for this employee. After approval, they receive
                  a notification at their personal email and can sign in with that company email and
                  the password they created during onboarding.
                </p>
              </div>

              <div className="mx-auto max-w-lg space-y-5 px-6 py-6">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">
                    Company email <span className="text-foreground">*</span>
                  </Label>
                  <Input
                    type="email"
                    className="h-10"
                    placeholder="e.g. coder@yourcompany.com"
                    value={companyEmail}
                    onChange={(e) => setCompanyEmail(e.target.value)}
                    disabled={isPending}
                    autoComplete="off"
                  />
                  <p className="text-xs text-muted-foreground">
                    This is the login email the employee will use on the company portal.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Portal role when employee is created</Label>
                  <LabeledSelect
                    value={intendedRoleId}
                    placeholder="Select portal role"
                    items={roleItems}
                    onValueChange={setIntendedRoleId}
                    disabled={isPending}
                    triggerClassName="h-10 w-full"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-sm font-medium text-muted-foreground">
                      HR comments (optional)
                    </Label>
                    <Input
                      className="h-10"
                      placeholder="Internal notes for this review"
                      value={hrComments}
                      onChange={(e) => setHrComments(e.target.value)}
                      disabled={isPending}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-sm font-medium text-muted-foreground">
                      Correction notes
                    </Label>
                    <Input
                      className="h-10"
                      placeholder="Required only when requesting changes"
                      value={correctionNotes}
                      onChange={(e) => setCorrectionNotes(e.target.value)}
                      disabled={isPending}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2 border-t border-border/60 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <Button
                    onClick={() => processReview("approve")}
                    disabled={isPending || !companyEmail.trim()}
                    className="sm:min-w-[11rem]"
                  >
                    {isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Approve & create employee
                  </Button>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() => processReview("request_corrections")}
                      disabled={isPending}
                    >
                      Request corrections
                    </Button>
                    <Button
                      variant="outline"
                      className="text-destructive hover:bg-destructive/5 hover:text-destructive"
                      onClick={() => processReview("reject")}
                      disabled={isPending}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          <section className="rounded-xl border bg-card p-5 shadow-sm">
            <h2 className="text-center font-semibold">Activity timeline</h2>
            {detail.timeline.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No activity recorded yet.</p>
            ) : (
              <div className="mt-4 space-y-4">
                {detail.timeline.map((event) => (
                  <div key={event.id} className="flex gap-3">
                    <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    <div className="min-w-0 flex-1 border-l border-border pl-4 pb-1">
                      <div className="font-medium text-sm">{event.title}</div>
                      {event.description ? (
                        <div className="text-sm text-muted-foreground mt-0.5">
                          {event.description}
                        </div>
                      ) : null}
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatDateTime(event.occurredAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
      </div>

      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel onboarding?</DialogTitle>
            <DialogDescription>
              {detail.fullName} will lose portal access and active invitation links will stop
              working. You can resend a new invitation later to reopen this onboarding.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => setCancelDialogOpen(false)}
            >
              Keep onboarding
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isPending}
              onClick={cancelCase}
            >
              {isPending ? "Cancelling…" : "Cancel onboarding"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
