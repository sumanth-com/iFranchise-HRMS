"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import { OnboardingDocumentUpload } from "@/components/onboarding/candidate/onboarding-document-upload";
import { LabeledSelect } from "@/components/payroll/payroll-select";
import {
  createEducationEntry,
  educationLevelLabel,
} from "@/lib/onboarding/education-utils";
import {
  ONBOARDING_EDUCATION_LEVELS,
  type OnboardingEducationEntry,
  type OnboardingEducationLevelCode,
} from "@/types/onboarding";
import { cn } from "@/lib/utils";

const LEVEL_ITEMS = ONBOARDING_EDUCATION_LEVELS.map((level) => ({
  value: level.code,
  label: level.label,
}));

const educationInputClassName =
  "h-9 bg-background text-sm text-foreground caret-foreground placeholder:text-muted-foreground dark:bg-background dark:text-foreground";

type UploadMeta = {
  fileName: string | null;
  uploading: boolean;
  pendingFileName: string | null;
};

type OnboardingEducationSectionProps = {
  entries: OnboardingEducationEntry[];
  onEntriesChange: (entries: OnboardingEducationEntry[]) => void;
  onUpload: (entryId: string, file: File) => void;
  getUploadMeta: (entryId: string) => UploadMeta;
};

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <Label className="text-sm font-medium text-foreground">
      {label}
      {required ? <span className="text-foreground"> *</span> : null}
    </Label>
  );
}

export function OnboardingEducationSection({
  entries,
  onEntriesChange,
  onUpload,
  getUploadMeta,
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
        const meta = getUploadMeta(entry.id);
        return (
          <div
            key={entry.id}
            className="space-y-3 rounded-xl border border-border bg-muted/30 p-4 dark:bg-muted/20"
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
                <Trash2 className="mr-1 h-3.5 w-3.5" />
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
                  triggerClassName={cn(educationInputClassName, "w-full")}
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
                  className={educationInputClassName}
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

            <OnboardingDocumentUpload
              label={`${educationLevelLabel(entry.level)} certificate`}
              required
              fileName={meta.fileName}
              uploading={meta.uploading}
              pendingFileName={meta.pendingFileName}
              onSelectFile={(file) => onUpload(entry.id, file)}
            />
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
