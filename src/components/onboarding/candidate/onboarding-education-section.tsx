"use client";

import { useMemo, type ReactNode } from "react";

import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import { OnboardingDocumentUpload } from "@/components/onboarding/candidate/onboarding-document-upload";
import { OnboardingEducationSelect } from "@/components/onboarding/candidate/onboarding-education-select";
import { OnboardingTypeaheadField } from "@/components/onboarding/candidate/onboarding-typeahead-field";
import {
  ACADEMIC_STREAMS,
  filterEducationOptions,
  GRADUATION_DEGREES,
  GRADUATION_SPECIALIZATIONS,
  INDIAN_COLLEGES,
  INDIAN_SCHOOL_BOARDS,
  INDIAN_UNIVERSITIES,
  INTERMEDIATE_QUALIFICATIONS,
  passingYearSelectItems,
  toSelectItems,
} from "@/lib/onboarding/education-options";
import {
  EDUCATION_DOCUMENT_CODES,
  educationDocumentMaxMb,
  type OnboardingEducationFormData,
} from "@/lib/onboarding/education-utils";
import { INDIAN_STATES } from "@/lib/onboarding/india-locations";
import { cn } from "@/lib/utils";

const educationInputClassName =
  "h-9 bg-background text-sm text-foreground caret-foreground placeholder:text-muted-foreground dark:bg-background dark:text-foreground";

const BOARD_ITEMS = toSelectItems(INDIAN_SCHOOL_BOARDS);
const QUALIFICATION_ITEMS = toSelectItems(INTERMEDIATE_QUALIFICATIONS);
const STREAM_ITEMS = toSelectItems(ACADEMIC_STREAMS);
const DEGREE_ITEMS = toSelectItems(GRADUATION_DEGREES);
const SPECIALIZATION_ITEMS = toSelectItems(GRADUATION_SPECIALIZATIONS);
const STATE_ITEMS = toSelectItems(INDIAN_STATES);
const YEAR_ITEMS = passingYearSelectItems();

type EducationFormUpdater =
  | OnboardingEducationFormData
  | ((prev: OnboardingEducationFormData) => OnboardingEducationFormData);

type UploadMeta = {
  fileName: string | null;
  uploading: boolean;
  pendingFileName: string | null;
};

type OnboardingEducationSectionProps = {
  form: OnboardingEducationFormData;
  onFormChange: (updater: EducationFormUpdater) => void;
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

function UploadPair({
  left,
  right,
}: {
  left: ReactNode;
  right: ReactNode;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {left}
      {right}
    </div>
  );
}

export function OnboardingEducationSection({
  form,
  onFormChange,
  onUpload,
  getUploadMeta,
}: OnboardingEducationSectionProps) {
  const collegeSuggestions = useMemo(
    () => filterEducationOptions(INDIAN_COLLEGES, form.graduation.collegeName),
    [form.graduation.collegeName],
  );
  const universitySuggestions = useMemo(
    () => filterEducationOptions(INDIAN_UNIVERSITIES, form.graduation.university),
    [form.graduation.university],
  );

  function updateSsc(patch: Partial<OnboardingEducationFormData["ssc"]>) {
    onFormChange((prev) => ({ ...prev, ssc: { ...prev.ssc, ...patch } }));
  }

  function updateIntermediate(patch: Partial<OnboardingEducationFormData["intermediate"]>) {
    onFormChange((prev) => ({
      ...prev,
      intermediate: { ...prev.intermediate, ...patch },
    }));
  }

  function updateGraduation(patch: Partial<OnboardingEducationFormData["graduation"]>) {
    onFormChange((prev) => ({
      ...prev,
      graduation: { ...prev.graduation, ...patch },
    }));
  }

  function renderUpload(code: string, label: string, required = true) {
    const meta = getUploadMeta(code);
    return (
      <OnboardingDocumentUpload
        variant="card"
        label={label}
        required={required}
        maxUploadMb={educationDocumentMaxMb(code)}
        fileName={meta.fileName}
        uploading={meta.uploading}
        pendingFileName={meta.pendingFileName}
        onSelectFile={(file) => onUpload(code, file)}
      />
    );
  }

  const selectTriggerClassName = cn(educationInputClassName, "w-full");

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <SectionHeading title="10th Class (SSC)" />
        <div className="space-y-1">
          <FieldLabel label="School name" required />
          <Input
            className={educationInputClassName}
            value={form.ssc.schoolName}
            placeholder="Enter school name"
            autoComplete="off"
            onChange={(e) => updateSsc({ schoolName: e.target.value })}
          />
        </div>
        <div className="relative space-y-1">
          <FieldLabel label="Board" required />
          <OnboardingEducationSelect
            items={BOARD_ITEMS}
            value={form.ssc.board}
            placeholder="Select board (CBSE / ICSE / State Board)"
            onValueChange={(value) => updateSsc({ board: value })}
            triggerClassName={selectTriggerClassName}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="relative space-y-1">
            <FieldLabel label="Year of passing" required />
            <OnboardingEducationSelect
              items={YEAR_ITEMS}
              value={form.ssc.yearOfPassing}
              placeholder="Select year"
              onValueChange={(value) => updateSsc({ yearOfPassing: value })}
              triggerClassName={selectTriggerClassName}
            />
          </div>
          <div className="space-y-1">
            <FieldLabel label="Percentage / CGPA" required />
            <Input
              className={educationInputClassName}
              value={form.ssc.percentageOrCgpa}
              placeholder="e.g. 85% or 9.2 CGPA"
              autoComplete="off"
              onChange={(e) => updateSsc({ percentageOrCgpa: e.target.value })}
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <FieldLabel label="Roll number / Registration number" required />
            <Input
              className={educationInputClassName}
              value={form.ssc.rollNumber}
              autoComplete="off"
              onChange={(e) => updateSsc({ rollNumber: e.target.value })}
            />
          </div>
          <div className="relative space-y-1">
            <FieldLabel label="Place / State" required />
            <OnboardingEducationSelect
              items={STATE_ITEMS}
              value={form.ssc.placeOrState}
              placeholder="Select state"
              onValueChange={(value) => updateSsc({ placeOrState: value })}
              triggerClassName={selectTriggerClassName}
            />
          </div>
        </div>
        <UploadPair
          left={renderUpload(
            EDUCATION_DOCUMENT_CODES.ssc_marksheet,
            "10th Marks Memo / Marksheet",
          )}
          right={renderUpload(
            EDUCATION_DOCUMENT_CODES.ssc_certificate,
            "10th Certificate / SSC Certificate",
          )}
        />
      </section>

      <section className="space-y-4">
        <SectionHeading title="12th Class — Application Details" />
        <div className="relative space-y-1">
          <FieldLabel label="Qualification" required />
          <OnboardingEducationSelect
            items={QUALIFICATION_ITEMS}
            value={form.intermediate.qualification}
            placeholder="12th / Intermediate / PUC"
            onValueChange={(value) => updateIntermediate({ qualification: value })}
            triggerClassName={selectTriggerClassName}
          />
        </div>
        <div className="space-y-1">
          <FieldLabel label="School / College name" required />
          <Input
            className={educationInputClassName}
            value={form.intermediate.schoolName}
            placeholder="Enter school or college name"
            autoComplete="off"
            onChange={(e) => updateIntermediate({ schoolName: e.target.value })}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="relative space-y-1">
            <FieldLabel label="Board" required />
            <OnboardingEducationSelect
              items={BOARD_ITEMS}
              value={form.intermediate.board}
              placeholder="CBSE / ISC / State Board"
              onValueChange={(value) => updateIntermediate({ board: value })}
              triggerClassName={selectTriggerClassName}
            />
          </div>
          <div className="relative space-y-1">
            <FieldLabel label="Stream" required />
            <OnboardingEducationSelect
              items={STREAM_ITEMS}
              value={form.intermediate.stream}
              placeholder="MPC / BiPC / Commerce / Arts"
              onValueChange={(value) => updateIntermediate({ stream: value })}
              triggerClassName={selectTriggerClassName}
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="relative space-y-1">
            <FieldLabel label="Year of passing" required />
            <OnboardingEducationSelect
              items={YEAR_ITEMS}
              value={form.intermediate.yearOfPassing}
              placeholder="Select year"
              onValueChange={(value) => updateIntermediate({ yearOfPassing: value })}
              triggerClassName={selectTriggerClassName}
            />
          </div>
          <div className="space-y-1">
            <FieldLabel label="Percentage / CGPA" required />
            <Input
              className={educationInputClassName}
              value={form.intermediate.percentageOrCgpa}
              placeholder="e.g. 85% or 9.2 CGPA"
              autoComplete="off"
              onChange={(e) => updateIntermediate({ percentageOrCgpa: e.target.value })}
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <FieldLabel label="Roll number / Registration number" required />
            <Input
              className={educationInputClassName}
              value={form.intermediate.rollNumber}
              autoComplete="off"
              onChange={(e) => updateIntermediate({ rollNumber: e.target.value })}
            />
          </div>
          <div className="relative space-y-1">
            <FieldLabel label="College state / Location" required />
            <OnboardingEducationSelect
              items={STATE_ITEMS}
              value={form.intermediate.collegeStateOrLocation}
              placeholder="Select state"
              onValueChange={(value) => updateIntermediate({ collegeStateOrLocation: value })}
              triggerClassName={selectTriggerClassName}
            />
          </div>
        </div>
        <UploadPair
          left={renderUpload(
            EDUCATION_DOCUMENT_CODES.intermediate_marksheet,
            "12th Marksheet",
          )}
          right={renderUpload(
            EDUCATION_DOCUMENT_CODES.intermediate_certificate,
            "12th Passing Certificate / Intermediate Certificate",
          )}
        />
      </section>

      <section className="space-y-4">
        <SectionHeading title="Graduation — Application Details" />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="relative space-y-1">
            <FieldLabel label="Degree" required />
            <OnboardingEducationSelect
              items={DEGREE_ITEMS}
              value={form.graduation.degree}
              placeholder="B.Tech, B.E., B.Sc, etc."
              onValueChange={(value) => updateGraduation({ degree: value })}
              triggerClassName={selectTriggerClassName}
            />
          </div>
          <div className="relative space-y-1">
            <FieldLabel label="Specialization / Branch" required />
            <OnboardingEducationSelect
              items={SPECIALIZATION_ITEMS}
              value={form.graduation.specialization}
              placeholder="CSE, ECE, Mechanical, etc."
              onValueChange={(value) => updateGraduation({ specialization: value })}
              triggerClassName={selectTriggerClassName}
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <OnboardingTypeaheadField
            label="College / Institution name"
            required
            value={form.graduation.collegeName}
            placeholder="Type or select college"
            suggestions={collegeSuggestions}
            onValueChange={(value) => updateGraduation({ collegeName: value })}
            inputClassName={educationInputClassName}
          />
          <OnboardingTypeaheadField
            label="University"
            required
            value={form.graduation.university}
            placeholder="Type or select university"
            suggestions={universitySuggestions}
            onValueChange={(value) => updateGraduation({ university: value })}
            inputClassName={educationInputClassName}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="relative space-y-1">
            <FieldLabel label="Year of admission" required />
            <OnboardingEducationSelect
              items={YEAR_ITEMS}
              value={form.graduation.yearOfAdmission}
              placeholder="Select year"
              onValueChange={(value) => updateGraduation({ yearOfAdmission: value })}
              triggerClassName={selectTriggerClassName}
            />
          </div>
          <div className="relative space-y-1">
            <FieldLabel label="Year of passing" required />
            <OnboardingEducationSelect
              items={YEAR_ITEMS}
              value={form.graduation.yearOfPassing}
              placeholder="Select year"
              onValueChange={(value) => updateGraduation({ yearOfPassing: value })}
              triggerClassName={selectTriggerClassName}
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <FieldLabel label="Percentage / CGPA" required />
            <Input
              className={educationInputClassName}
              value={form.graduation.percentageOrCgpa}
              placeholder="e.g. 75% or 8.5 CGPA"
              autoComplete="off"
              onChange={(e) => updateGraduation({ percentageOrCgpa: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <FieldLabel label="Roll number / Registration number" required />
            <Input
              className={educationInputClassName}
              value={form.graduation.rollNumber}
              autoComplete="off"
              onChange={(e) => updateGraduation({ rollNumber: e.target.value })}
            />
          </div>
          <div className="relative space-y-1">
            <FieldLabel label="State / Location" required />
            <OnboardingEducationSelect
              items={STATE_ITEMS}
              value={form.graduation.stateOrLocation}
              placeholder="Select state"
              onValueChange={(value) => updateGraduation({ stateOrLocation: value })}
              triggerClassName={selectTriggerClassName}
            />
          </div>
        </div>
        <UploadPair
          left={renderUpload(
            EDUCATION_DOCUMENT_CODES.graduation_semester_marksheets,
            "Semester-wise Mark Sheets",
          )}
          right={renderUpload(
            EDUCATION_DOCUMENT_CODES.graduation_degree_certificate,
            "Degree Certificate",
          )}
        />
        <UploadPair
          left={renderUpload(
            EDUCATION_DOCUMENT_CODES.graduation_tc,
            "Transfer Certificate (TC)",
            false,
          )}
          right={renderUpload(
            EDUCATION_DOCUMENT_CODES.graduation_migration,
            "Migration Certificate",
            false,
          )}
        />
      </section>
    </div>
  );
}
