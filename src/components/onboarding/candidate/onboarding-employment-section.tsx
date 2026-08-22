"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import { OnboardingDocumentUpload } from "@/components/onboarding/candidate/onboarding-document-upload";
import { OnboardingEducationSelect } from "@/components/onboarding/candidate/onboarding-education-select";
import {
  computeEmploymentDuration,
  createEmptyEmploymentEntry,
  EMPLOYMENT_ENTRY_DOCUMENTS,
  EMPLOYMENT_TYPE_OPTIONS,
  employmentDocumentTypeCode,
  type OnboardingEmploymentEntry,
  type OnboardingEmploymentFormData,
} from "@/lib/onboarding/employment-utils";
import { todayIsoDate } from "@/lib/onboarding/personal-field-options";
import { toSelectItems } from "@/lib/onboarding/education-options";
import { cn } from "@/lib/utils";

const employmentInputClassName =
  "h-9 bg-background text-sm text-foreground caret-foreground placeholder:text-muted-foreground dark:bg-background dark:text-foreground";

const EMPLOYMENT_TYPE_ITEMS = toSelectItems(EMPLOYMENT_TYPE_OPTIONS);

type UploadMeta = {
  fileName: string | null;
  uploading: boolean;
  pendingFileName: string | null;
};

type EmploymentFormUpdater =
  | OnboardingEmploymentFormData
  | ((prev: OnboardingEmploymentFormData) => OnboardingEmploymentFormData);

type OnboardingEmploymentSectionProps = {
  form: OnboardingEmploymentFormData;
  onFormChange: (updater: EmploymentFormUpdater) => void;
  onUpload: (documentCode: string, file: File) => void;
  getUploadMeta: (documentCode: string) => UploadMeta;
};

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <Label className="text-sm font-medium text-foreground">
      {label}
      {required ? <span className="text-foreground"> *</span> : null}
    </Label>
  );
}

function SectionHeading({ title }: { title: string }) {
  return (
    <h3 className="border-b border-border/60 pb-2 text-base font-semibold tracking-tight text-foreground">
      {title}
    </h3>
  );
}

export function OnboardingEmploymentSection({
  form,
  onFormChange,
  onUpload,
  getUploadMeta,
}: OnboardingEmploymentSectionProps) {
  const today = todayIsoDate();
  const selectTriggerClassName = cn(employmentInputClassName, "w-full");

  function updateEntry(id: string, patch: Partial<OnboardingEmploymentEntry>) {
    onFormChange((prev) => ({
      ...prev,
      entries: prev.entries.map((entry) => {
        if (entry.id !== id) return entry;
        const next = { ...entry, ...patch };
        if (patch.dateOfJoining !== undefined || patch.dateOfLeaving !== undefined) {
          const duration = computeEmploymentDuration(
            patch.dateOfJoining ?? entry.dateOfJoining,
            patch.dateOfLeaving ?? entry.dateOfLeaving,
          );
          if (duration) next.totalExperience = duration;
        }
        return next;
      }),
    }));
  }

  function addCompany() {
    onFormChange((prev) => ({
      ...prev,
      entries: [...prev.entries, createEmptyEmploymentEntry()],
    }));
  }

  function removeCompany(id: string) {
    onFormChange((prev) => {
      const nextEntries = prev.entries.filter((entry) => entry.id !== id);
      return {
        ...prev,
        entries:
          nextEntries.length > 0 ? nextEntries : [createEmptyEmploymentEntry()],
      };
    });
  }

  function setNoPriorExperience(checked: boolean) {
    onFormChange((prev) => ({
      noPriorExperience: checked,
      entries: checked
        ? []
        : prev.entries.length > 0
          ? prev.entries
          : [createEmptyEmploymentEntry()],
    }));
  }

  function renderUpload(entryId: string, doc: (typeof EMPLOYMENT_ENTRY_DOCUMENTS)[number]) {
    const code = employmentDocumentTypeCode(entryId, doc.code);
    const meta = getUploadMeta(code);
    const label =
      "hint" in doc && doc.hint ? `${doc.label} — ${doc.hint}` : doc.label;
    return (
      <OnboardingDocumentUpload
        key={code}
        variant="card"
        label={label}
        required={doc.required}
        fileName={meta.fileName}
        uploading={meta.uploading}
        pendingFileName={meta.pendingFileName}
        onSelectFile={(file) => onUpload(code, file)}
      />
    );
  }

  return (
    <div className="min-w-0 max-w-full space-y-6">
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-muted/20 p-4 text-sm">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={form.noPriorExperience}
          onChange={(e) => setNoPriorExperience(e.target.checked)}
        />
        <span>
          <span className="font-medium text-foreground">No prior work experience</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            Check this if you are a fresher with no previous employment. You can continue to the
            next section without filling company details.
          </span>
        </span>
      </label>

      {!form.noPriorExperience ? (
        <>
          {form.entries.map((entry, index) => (
            <div
              key={entry.id}
              className="space-y-4 rounded-xl border border-border bg-muted/10 p-4 sm:p-5"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">
                  Company {index + 1}
                </p>
                {form.entries.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-muted-foreground hover:text-destructive"
                    onClick={() => removeCompany(entry.id)}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Remove
                  </Button>
                ) : null}
              </div>

              <SectionHeading title="Previous Employment Details" />

              <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <FieldLabel label="Previous company name" required />
                  <Input
                    className={employmentInputClassName}
                    value={entry.companyName}
                    autoComplete="off"
                    placeholder="Company name"
                    onChange={(e) => updateEntry(entry.id, { companyName: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <FieldLabel label="Company location" required />
                  <Input
                    className={employmentInputClassName}
                    value={entry.companyLocation}
                    autoComplete="off"
                    placeholder="City / state"
                    onChange={(e) => updateEntry(entry.id, { companyLocation: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid min-w-0 gap-3 lg:grid-cols-3">
                <div className="space-y-1">
                  <FieldLabel label="Job title / Designation" required />
                  <Input
                    className={employmentInputClassName}
                    value={entry.jobTitle}
                    autoComplete="off"
                    onChange={(e) => updateEntry(entry.id, { jobTitle: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <FieldLabel label="Department" required />
                  <Input
                    className={employmentInputClassName}
                    value={entry.department}
                    autoComplete="off"
                    onChange={(e) => updateEntry(entry.id, { department: e.target.value })}
                  />
                </div>
                <div className="relative space-y-1">
                  <FieldLabel label="Employment type" required />
                  <OnboardingEducationSelect
                    items={EMPLOYMENT_TYPE_ITEMS}
                    value={entry.employmentType}
                    placeholder="Full-time / Part-time / Contract / Internship"
                    onValueChange={(value) => updateEntry(entry.id, { employmentType: value })}
                    triggerClassName={selectTriggerClassName}
                  />
                </div>
              </div>

              <div className="grid min-w-0 gap-3 lg:grid-cols-3">
                <div className="space-y-1">
                  <FieldLabel label="Date of joining" required />
                  <Input
                    type="date"
                    className={employmentInputClassName}
                    value={entry.dateOfJoining}
                    max={entry.dateOfLeaving || today}
                    onChange={(e) => updateEntry(entry.id, { dateOfJoining: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <FieldLabel label="Date of leaving" required />
                  <Input
                    type="date"
                    className={employmentInputClassName}
                    value={entry.dateOfLeaving}
                    min={entry.dateOfJoining || undefined}
                    max={today}
                    onChange={(e) => updateEntry(entry.id, { dateOfLeaving: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <FieldLabel label="Total experience" required />
                  <Input
                    className={employmentInputClassName}
                    value={entry.totalExperience}
                    placeholder="e.g. 2 years 3 months"
                    autoComplete="off"
                    onChange={(e) => updateEntry(entry.id, { totalExperience: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <FieldLabel label="Last drawn CTC" required />
                  <Input
                    className={employmentInputClassName}
                    value={entry.lastDrawnCtc}
                    placeholder="e.g. 6,00,000 per annum"
                    autoComplete="off"
                    onChange={(e) => updateEntry(entry.id, { lastDrawnCtc: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <FieldLabel label="Reason for leaving" required />
                  <Input
                    className={employmentInputClassName}
                    value={entry.reasonForLeaving}
                    autoComplete="off"
                    onChange={(e) => updateEntry(entry.id, { reasonForLeaving: e.target.value })}
                  />
                </div>
              </div>

              <SectionHeading title="Previous Employment Documents" />
              <div className="grid min-w-0 gap-3 lg:grid-cols-3">
                {EMPLOYMENT_ENTRY_DOCUMENTS.slice(0, 3).map((doc) =>
                  renderUpload(entry.id, doc),
                )}
              </div>
              <div className="grid min-w-0 gap-3 lg:grid-cols-3">
                {EMPLOYMENT_ENTRY_DOCUMENTS.slice(3).map((doc) =>
                  renderUpload(entry.id, doc),
                )}
              </div>
            </div>
          ))}

          <div className="flex justify-center">
            <Button type="button" variant="outline" size="sm" onClick={addCompany}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add company
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
