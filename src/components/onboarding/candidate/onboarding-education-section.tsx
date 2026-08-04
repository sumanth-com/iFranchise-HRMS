"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import { LabeledSelect } from "@/components/payroll/payroll-select";
import { ONBOARDING_UPLOAD_MAX_MB } from "@/lib/onboarding/constants";
import {
  createEducationEntry,
  educationDocumentTypeCode,
  educationLevelLabel,
} from "@/lib/onboarding/education-utils";
import {
  ONBOARDING_EDUCATION_LEVELS,
  type CandidatePortalContext,
  type OnboardingEducationEntry,
  type OnboardingEducationLevelCode,
} from "@/types/onboarding";

const UPLOAD_ACCEPT =
  ".pdf,.doc,.docx,.xls,.xlsx,.zip,image/jpeg,image/png,image/webp";

const LEVEL_ITEMS = ONBOARDING_EDUCATION_LEVELS.map((level) => ({
  value: level.code,
  label: level.label,
}));

type OnboardingEducationSectionProps = {
  context: CandidatePortalContext;
  entries: OnboardingEducationEntry[];
  onEntriesChange: (entries: OnboardingEducationEntry[]) => void;
  onUpload: (entryId: string, file: File) => void;
};

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <Label className="text-sm font-medium">
      {label}
      {required ? <span className="text-foreground"> *</span> : null}
    </Label>
  );
}

function documentUploaded(
  context: CandidatePortalContext,
  entryId: string,
): boolean {
  return context.documents.some(
    (doc) =>
      doc.documentCategory === "education" &&
      doc.documentTypeCode === educationDocumentTypeCode(entryId),
  );
}

export function OnboardingEducationSection({
  context,
  entries,
  onEntriesChange,
  onUpload,
}: OnboardingEducationSectionProps) {
  function updateEntry(id: string, patch: Partial<OnboardingEducationEntry>) {
    onEntriesChange(entries.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)));
  }

  function removeEntry(id: string) {
    onEntriesChange(entries.filter((entry) => entry.id !== id));
  }

  function addEntry(level: OnboardingEducationLevelCode) {
    onEntriesChange([...entries, createEducationEntry(level)]);
  }

  if (entries.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-center text-sm text-muted-foreground">
          Add your qualifications — select the level, enter the school or college name, and upload
          the certificate for each.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {ONBOARDING_EDUCATION_LEVELS.slice(0, 4).map((level) => (
            <Button
              key={level.code}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addEntry(level.code)}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              {level.label}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {entries.map((entry, index) => {
        const uploaded = documentUploaded(context, entry.id);
        return (
          <div
            key={entry.id}
            className="rounded-xl border border-border/80 bg-muted/15 p-4 space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Qualification {index + 1}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-muted-foreground hover:text-destructive"
                onClick={() => removeEntry(entry.id)}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Remove
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <FieldLabel label="Education level" required />
                <LabeledSelect
                  items={LEVEL_ITEMS}
                  value={entry.level}
                  placeholder="Select level"
                  onValueChange={(value) =>
                    updateEntry(entry.id, { level: value as OnboardingEducationLevelCode })
                  }
                  triggerClassName="h-9 w-full text-sm"
                />
              </div>
              <div className="space-y-1">
                <FieldLabel
                  label={
                    entry.level === "ssc" || entry.level === "intermediate"
                      ? "School name"
                      : "College / institution name"
                  }
                  required
                />
                <Input
                  className="h-9 text-sm"
                  value={entry.institutionName}
                  onChange={(e) => updateEntry(entry.id, { institutionName: e.target.value })}
                  placeholder={
                    entry.level === "ssc" || entry.level === "intermediate"
                      ? "Enter school name"
                      : "Enter college or institution name"
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5 rounded-lg border bg-background/80 p-3">
              <FieldLabel
                label={`${educationLevelLabel(entry.level)} certificate`}
                required
              />
              {uploaded ? (
                <p className="text-xs font-medium text-emerald-600">Certificate uploaded</p>
              ) : null}
              <Input
                type="file"
                accept={UPLOAD_ACCEPT}
                className="text-sm"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onUpload(entry.id, file);
                  e.target.value = "";
                }}
              />
              <p className="text-[11px] text-muted-foreground">
                PDF, Word, Excel, images, or ZIP · max {ONBOARDING_UPLOAD_MAX_MB} MB
              </p>
            </div>
          </div>
        );
      })}

      <div className="flex flex-wrap justify-center gap-2 pt-1">
        {ONBOARDING_EDUCATION_LEVELS.map((level) => (
          <Button
            key={level.code}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addEntry(level.code)}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add {level.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
