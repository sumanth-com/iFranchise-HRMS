"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import { OnboardingAddressFields } from "@/components/onboarding/candidate/onboarding-address-fields";
import { OnboardingDocumentUpload } from "@/components/onboarding/candidate/onboarding-document-upload";
import { OnboardingEducationSection } from "@/components/onboarding/candidate/onboarding-education-section";
import { OnboardingEmploymentSection } from "@/components/onboarding/candidate/onboarding-employment-section";
import { OnboardingTermsSection } from "@/components/onboarding/candidate/onboarding-terms-section";
import { OnboardingPhoneField } from "@/components/onboarding/candidate/onboarding-phone-field";
import { OnboardingSignature } from "@/components/onboarding/candidate/onboarding-signature";
import { useOnboardingPortalProgress } from "@/components/onboarding/candidate/onboarding-portal-progress-context";
import { OnboardingStepNav } from "@/components/onboarding/candidate/onboarding-step-nav";
import { OnboardingSubmittedCelebration } from "@/components/onboarding/candidate/onboarding-submitted-celebration";
import { OnboardingWizardSelect } from "@/components/onboarding/candidate/onboarding-wizard-select";
import {
  saveCandidateAgreementsAction,
  saveCandidatePoliciesAction,
  saveCandidateSectionAction,
  saveCandidateSignatureAction,
  submitCandidateOnboardingAction,
  uploadCandidateDocumentAction,
} from "@/lib/onboarding/actions/candidate-onboarding-actions";
import {
  ONBOARDING_BLOOD_GROUP_OPTIONS,
  ONBOARDING_GENDER_OPTIONS,
  ONBOARDING_MARITAL_STATUS_OPTIONS,
  normalizeSelectValue,
  todayIsoDate,
  toIsoDate,
} from "@/lib/onboarding/personal-field-options";
import {
  sanitizeAccountNumber,
  sanitizeIfsc,
  ONBOARDING_BANK_ACCOUNT_TYPE_OPTIONS,
} from "@/lib/onboarding/bank-field-utils";
import {
  sanitizeAadhaar,
  sanitizePan,
} from "@/lib/onboarding/identity-field-utils";
import {
  createEmptyEducationForm,
  educationFormToPayload,
  parseEducationForm,
  type OnboardingEducationFormData,
} from "@/lib/onboarding/education-utils";
import {
  createEmptyEmploymentForm,
  employmentFormToPayload,
  parseEmploymentForm,
  type OnboardingEmploymentFormData,
} from "@/lib/onboarding/employment-utils";
import {
  canNavigateToStep,
  canSubmitOnboarding,
  getCompletedStepIndices,
  getFirstIncompleteStepIndex,
  validateEducationSection,
  validateEmploymentSection,
  validateOnboardingSection,
} from "@/lib/onboarding/onboarding-section-validation";
import {
  ONBOARDING_AGREEMENT_TYPES,
  ONBOARDING_IDENTITY_DOCUMENTS,
  ONBOARDING_POLICY_DOCUMENTS,
  ONBOARDING_WIZARD_SECTIONS,
  type CandidatePortalContext,
} from "@/types/onboarding";
import { cn } from "@/lib/utils";

const wizardInputClassName =
  "h-9 bg-background text-sm text-foreground caret-foreground placeholder:text-muted-foreground dark:bg-background dark:text-foreground";

function uploadSlotKey(documentCategory: string, documentTypeCode: string) {
  return `${documentCategory}:${documentTypeCode}`;
}

const SECTION_TITLES: Record<string, string> = {
  personal: "Personal Details",
  identity: "Identity Documents",
  education: "Education",
  employment_history: "Previous Employment",
  bank: "Bank Details",
  terms: "Policies & Terms",
  signature: "Electronic Signature",
};

const GENDER_ITEMS = ONBOARDING_GENDER_OPTIONS.map((item) => ({
  value: item.value,
  label: item.label,
}));
const MARITAL_ITEMS = ONBOARDING_MARITAL_STATUS_OPTIONS.map((item) => ({
  value: item.value,
  label: item.label,
}));
const BLOOD_GROUP_ITEMS = ONBOARDING_BLOOD_GROUP_OPTIONS.map((item) => ({
  value: item.value,
  label: item.label,
}));
const BANK_ACCOUNT_TYPE_ITEMS = ONBOARDING_BANK_ACCOUNT_TYPE_OPTIONS.map((item) => ({
  value: item.value,
  label: item.label,
}));

const IDENTITY_REQUIRED_CODES = new Set(["aadhaar", "pan"]);
const IDENTITY_OPTIONAL_CODES = new Set(["passport", "voter_id", "driving_license"]);

function identityDocumentCardLabel(label: string, required: boolean): string {
  return required ? label : `${label} — optional`;
}

function readSectionField(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function buildLiveSectionPatch(
  sectionKey: string,
  saved: Record<string, unknown>,
  draft: Record<string, string>,
  fullName: string,
): Record<string, string> {
  const patch: Record<string, string> = {};
  for (const [key, value] of Object.entries(saved)) {
    const text = readSectionField(value);
    if (text) patch[key] = text;
  }
  for (const [key, value] of Object.entries(draft)) {
    if (value.trim()) patch[key] = value.trim();
  }

  if (sectionKey === "personal") {
    const dob = draft.dateOfBirth ?? toIsoDate(saved.dateOfBirth);
    if (dob) patch.dateOfBirth = dob;
  }

  if (sectionKey === "bank") {
    if (!patch.accountHolderName?.trim() && fullName.trim()) {
      patch.accountHolderName = fullName.trim();
    }
    const accountType = patch.accountType?.toLowerCase();
    if (accountType === "salary") patch.accountType = "savings";
  }

  if (sectionKey === "terms") {
    const accepted =
      draft.termsAccepted === "true" ||
      saved.termsAccepted === true ||
      saved.termsAccepted === "true";
    if (accepted) patch.termsAccepted = "true";
  }

  return patch;
}

function documentRecord(
  context: CandidatePortalContext,
  category: string,
  code: string,
) {
  return context.documents.find(
    (doc) => doc.documentCategory === category && doc.documentTypeCode === code,
  );
}

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <Label className="text-sm font-medium text-foreground">
      {label}
      {required ? <span className="text-foreground"> *</span> : null}
    </Label>
  );
}

type OnboardingWizardProps = {
  context: CandidatePortalContext;
  onRefresh: () => void | Promise<void>;
};

export function OnboardingWizard({ context, onRefresh }: OnboardingWizardProps) {
  const progressCtx = useOnboardingPortalProgress();
  const [step, setStep] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [showCelebration, setShowCelebration] = useState(false);
  const initializedRef = useRef(false);
  const prevSectionKeyRef = useRef<string | null>(null);
  const sectionKey = ONBOARDING_WIZARD_SECTIONS[step];
  const sectionData = context.sections.find((s) => s.sectionKey === sectionKey)?.data ?? {};
  const [form, setForm] = useState<Record<string, string>>({});
  const [educationForm, setEducationForm] = useState<OnboardingEducationFormData>(() =>
    createEmptyEducationForm(),
  );
  const [employmentForm, setEmploymentForm] = useState<OnboardingEmploymentFormData>(() =>
    createEmptyEmploymentForm(),
  );
  const [stepAnimKey, setStepAnimKey] = useState(0);
  const [uploadSlots, setUploadSlots] = useState<
    Record<string, { uploading: boolean; pendingFileName?: string }>
  >({});
  const contentScrollRef = useRef<HTMLDivElement>(null);

  const completedSteps = useMemo(() => getCompletedStepIndices(context), [context]);
  const firstIncompleteStep = useMemo(() => getFirstIncompleteStepIndex(context), [context]);
  const liveSectionPatch = useMemo(
    () => buildLiveSectionPatch(sectionKey, sectionData, form, context.fullName),
    [sectionKey, sectionData, form, context.fullName],
  );

  function validateCurrentSection() {
    if (sectionKey === "education") {
      return validateEducationSection(context, educationForm);
    }
    if (sectionKey === "employment_history") {
      return validateEmploymentSection(context, employmentForm);
    }
    return validateOnboardingSection(sectionKey, context, liveSectionPatch);
  }

  const currentValidation = useMemo(
    () => validateCurrentSection(),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- liveSectionPatch captures form + saved fields
    [sectionKey, context, liveSectionPatch, educationForm, employmentForm],
  );
  const submitValidation = useMemo(() => canSubmitOnboarding(context), [context]);

  useEffect(() => {
    if (!initializedRef.current) {
      setStep(getFirstIncompleteStepIndex(context));
      initializedRef.current = true;
    }
  }, [context]);

  useEffect(() => {
    const enteredSection = prevSectionKeyRef.current !== sectionKey;
    prevSectionKeyRef.current = sectionKey;

    if (sectionKey === "education" && enteredSection) {
      try {
        setEducationForm(parseEducationForm(sectionData));
      } catch {
        setEducationForm(createEmptyEducationForm());
      }
    }
    if (sectionKey === "employment_history" && enteredSection) {
      try {
        setEmploymentForm(parseEmploymentForm(sectionData));
      } catch {
        setEmploymentForm(createEmptyEmploymentForm());
      }
    }
  }, [sectionKey, sectionData]);

  useEffect(() => {
    const el = contentScrollRef.current;
    if (!el) return;
    el.scrollTop = 0;
  }, [step, stepAnimKey]);

  useEffect(() => {
    if (!progressCtx) return;
    progressCtx.setWizardStep({
      current: step + 1,
      total: ONBOARDING_WIZARD_SECTIONS.length,
    });
  }, [step, progressCtx]);

  useEffect(() => {
    return () => {
      progressCtx?.setWizardStep(null);
    };
  }, [progressCtx]);

  function sectionHintText(): string {
    if (!currentValidation.valid) {
      return "Complete required fields (*) to unlock the next section";
    }
    if (step < firstIncompleteStep) {
      return "Section completed";
    }
    return "Ready — continue to the next section";
  }

  function sectionPayload(): Record<string, unknown> {
    if (sectionKey === "education") {
      return { ...sectionData, ...educationFormToPayload(educationForm) };
    }
    if (sectionKey === "employment_history") {
      return { ...sectionData, ...employmentFormToPayload(employmentForm) };
    }
    if (sectionKey === "terms") {
      return {
        ...sectionData,
        termsAccepted: form.termsAccepted === "true",
        acceptedAt:
          form.termsAccepted === "true"
            ? new Date().toISOString()
            : sectionData.acceptedAt ?? null,
      };
    }
    return { ...sectionData, ...liveSectionPatch };
  }

  function validateBeforeSave(markComplete: boolean) {
    const validation = validateCurrentSection();
    if (markComplete && !validation.valid) {
      showValidationError(validation);
      return false;
    }
    return true;
  }

  function advanceStep() {
    setStepAnimKey((k) => k + 1);
    if (step < ONBOARDING_WIZARD_SECTIONS.length - 1) {
      setStep((s) => s + 1);
    }
  }

  function updateField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function personalField(key: string): string {
    if (form[key]) return form[key];
    return readSectionField(sectionData[key]);
  }

  function personalSelectValue(
    key: string,
    options: readonly { value: string }[],
  ): string {
    if (form[key]) return form[key];
    return normalizeSelectValue(sectionData[key], options);
  }

  function showValidationError(result: { missing: string[] }) {
    if (result.missing.length <= 3) {
      toast.error(`Please complete: ${result.missing.join(", ")}`);
    } else {
      toast.error(`Please complete ${result.missing.length} required items in this section`);
    }
  }

  function saveSection(markComplete = true) {
    if (!validateBeforeSave(markComplete)) return;

    startTransition(async () => {
      const merged = sectionPayload();
      const result = await saveCandidateSectionAction({
        caseId: context.caseId,
        sectionKey,
        data: merged,
        markComplete,
      });
      if (!result.success) toast.error(result.message);
      else {
        toast.success(markComplete ? "Section saved" : "Progress saved");
        setForm({});
        onRefresh();
      }
    });
  }

  function uploadMeta(documentCategory: string, documentTypeCode: string) {
    const key = uploadSlotKey(documentCategory, documentTypeCode);
    const slot = uploadSlots[key];
    const saved = documentRecord(context, documentCategory, documentTypeCode);
    return {
      fileName: saved?.fileName ?? null,
      uploading: Boolean(slot?.uploading),
      pendingFileName: slot?.pendingFileName ?? null,
    };
  }

  function uploadDoc(documentCategory: string, documentTypeCode: string, file: File) {
    const key = uploadSlotKey(documentCategory, documentTypeCode);
    setUploadSlots((prev) => ({
      ...prev,
      [key]: { uploading: true, pendingFileName: file.name },
    }));

    const fd = new FormData();
    fd.set("file", file);
    fd.set("documentCategory", documentCategory);
    fd.set("documentTypeCode", documentTypeCode);

    void (async () => {
      try {
        const result = await uploadCandidateDocumentAction(fd);
        if (!result.success) {
          toast.error(result.message);
          return;
        }
        toast.success(`${file.name} uploaded`);
        await onRefresh();
      } finally {
        setUploadSlots((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }
    })();
  }

  function goToStep(index: number) {
    if (index < 0 || index >= ONBOARDING_WIZARD_SECTIONS.length) return;
    if (!canNavigateToStep(index, context)) {
      toast.error("Complete the current section before opening the next step");
      return;
    }
    setForm({});
    setStepAnimKey((k) => k + 1);
    setStep(index);
  }

  async function markSectionCompleteIfNeeded() {
    if (sectionKey === "signature") {
      const result = await saveCandidateSectionAction({
        caseId: context.caseId,
        sectionKey,
        data: sectionData,
        markComplete: true,
      });
      if (!result.success) throw new Error(result.message);
    }
  }

  async function persistTermsAcknowledgements() {
    const policyCodes = ONBOARDING_POLICY_DOCUMENTS.map((policy) => policy.code);
    const agreementTypes = ONBOARDING_AGREEMENT_TYPES.map((agreement) => agreement.code);

    const policyResult = await saveCandidatePoliciesAction({
      caseId: context.caseId,
      policyCodes,
    });
    if (!policyResult.success) throw new Error(policyResult.message);

    const agreementResult = await saveCandidateAgreementsAction({
      caseId: context.caseId,
      agreementTypes,
    });
    if (!agreementResult.success) throw new Error(agreementResult.message);
  }

  function goNext() {
    const validation = validateCurrentSection();
    if (!validation.valid) {
      showValidationError(validation);
      return;
    }

    const isFormSection = sectionKey !== "signature";

    startTransition(async () => {
      try {
        if (isFormSection) {
          const merged = sectionPayload();
          const result = await saveCandidateSectionAction({
            caseId: context.caseId,
            sectionKey,
            data: merged,
            markComplete: true,
          });
          if (!result.success) {
            toast.error(result.message);
            return;
          }
          if (sectionKey === "terms") {
            await persistTermsAcknowledgements();
          }
        } else {
          await markSectionCompleteIfNeeded();
        }

        setForm({});
        advanceStep();
        void onRefresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not save section");
      }
    });
  }

  function submitAll() {
    const validation = canSubmitOnboarding(context);
    if (!validation.valid) {
      showValidationError(validation);
      return;
    }

    startTransition(async () => {
      try {
        if (sectionKey === "signature") {
          await saveCandidateSectionAction({
            caseId: context.caseId,
            sectionKey: "signature",
            data: sectionData,
            markComplete: true,
          });
        }

        const result = await submitCandidateOnboardingAction();
        if (!result.success) {
          toast.error(result.message);
          return;
        }

        setShowCelebration(true);
        await onRefresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Submission failed");
      }
    });
  }

  if (context.locked || showCelebration) {
    return (
      <OnboardingSubmittedCelebration
        fullName={context.fullName}
        status={context.status}
        joiningDate={context.joiningDate}
      />
    );
  }

  const isLastStep = step === ONBOARDING_WIZARD_SECTIONS.length - 1;

  return (
    <div className="mx-auto flex min-h-0 w-full min-w-0 max-w-6xl flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-lg shadow-black/5 ring-1 ring-border/50 dark:shadow-black/25">
        <div className="shrink-0">
          <OnboardingStepNav
            activeStep={step}
            completedSteps={completedSteps}
            context={context}
            onStepChange={goToStep}
          />
        </div>

        <div className="shrink-0 border-b border-border/60 px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3 gap-y-0.5">
              <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                {SECTION_TITLES[sectionKey]}
              </h2>
              <p
                className={cn(
                  "text-xs",
                  currentValidation.valid
                    ? "font-medium text-emerald-700 dark:text-emerald-400"
                    : "text-muted-foreground",
                )}
              >
                {sectionHintText()}
              </p>
            </div>
            <p className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:hidden">
              Step {step + 1} of {ONBOARDING_WIZARD_SECTIONS.length}
            </p>
          </div>
        </div>

        <div
          ref={contentScrollRef}
          className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain scroll-smooth px-4 py-4 sm:px-6 sm:py-5"
        >
          <div key={`${sectionKey}-${stepAnimKey}`} className="onboarding-section-enter min-w-0">
          {sectionKey === "personal" && (
            <div className="grid gap-2.5 sm:grid-cols-2">
              <div className="space-y-1">
                <FieldLabel label="Full name" required />
                <Input
                  className={wizardInputClassName}
                  value={personalField("fullName")}
                  onChange={(e) => updateField("fullName", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <FieldLabel label="Date of birth" required />
                <Input
                  type="date"
                  className={wizardInputClassName}
                  max={todayIsoDate()}
                  value={form.dateOfBirth ?? toIsoDate(sectionData.dateOfBirth)}
                  onChange={(e) => updateField("dateOfBirth", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <FieldLabel label="Gender" required />
                <OnboardingWizardSelect
                  items={GENDER_ITEMS}
                  value={personalSelectValue("gender", ONBOARDING_GENDER_OPTIONS)}
                  placeholder="Select gender"
                  onValueChange={(value) => updateField("gender", value)}
                  triggerClassName={wizardInputClassName}
                />
              </div>
              <div className="space-y-1">
                <FieldLabel label="Marital status" />
                <OnboardingWizardSelect
                  items={MARITAL_ITEMS}
                  value={personalSelectValue("maritalStatus", ONBOARDING_MARITAL_STATUS_OPTIONS)}
                  placeholder="Select marital status"
                  onValueChange={(value) => updateField("maritalStatus", value)}
                  triggerClassName={wizardInputClassName}
                />
              </div>
              <div className="space-y-1">
                <FieldLabel label="Blood group" />
                <OnboardingWizardSelect
                  items={BLOOD_GROUP_ITEMS}
                  value={personalSelectValue("bloodGroup", ONBOARDING_BLOOD_GROUP_OPTIONS)}
                  placeholder="Select blood group"
                  onValueChange={(value) => updateField("bloodGroup", value)}
                  triggerClassName={wizardInputClassName}
                />
              </div>
              <div className="space-y-1">
                <FieldLabel label="Nationality" />
                <Input
                  className={wizardInputClassName}
                  value={personalField("nationality")}
                  onChange={(e) => updateField("nationality", e.target.value)}
                  placeholder="Nationality"
                />
              </div>
              <OnboardingAddressFields
                stateValue={personalField("state")}
                cityValue={personalField("city")}
                pincodeValue={personalField("pincode")}
                addressLineValue={
                  form.addressLine ??
                  readSectionField(sectionData.addressLine ?? sectionData.address)
                }
                onStateChange={(value) => updateField("state", value)}
                onCityChange={(value) => updateField("city", value)}
                onPincodeChange={(value) => updateField("pincode", value)}
                onAddressLineChange={(value) => updateField("addressLine", value)}
                inputClassName={wizardInputClassName}
              />
              <OnboardingPhoneField
                label="Personal mobile"
                required
                className="w-full max-w-none"
                value={personalField("personalMobile")}
                onChange={(value) => updateField("personalMobile", value)}
                placeholder="Mobile number"
              />
              <OnboardingPhoneField
                label="Emergency contact"
                required
                className="w-full max-w-none"
                value={personalField("emergencyContact")}
                onChange={(value) => updateField("emergencyContact", value)}
                placeholder="Emergency number"
              />
              <div className="space-y-1 sm:col-span-2">
                <FieldLabel label="Personal email" required />
                <Input
                  type="email"
                  className={wizardInputClassName}
                  value={personalField("personalEmail")}
                  onChange={(e) => updateField("personalEmail", e.target.value)}
                />
              </div>
            </div>
          )}

          {sectionKey === "identity" && (
            <div className="space-y-6">
              <div className="mx-auto grid w-full max-w-3xl grid-cols-1 items-stretch gap-4 sm:grid-cols-2">
                {ONBOARDING_IDENTITY_DOCUMENTS.filter((doc) =>
                  IDENTITY_REQUIRED_CODES.has(doc.code),
                ).map((doc) => {
                  const meta = uploadMeta("identity", doc.code);
                  return (
                    <OnboardingDocumentUpload
                      key={doc.code}
                      variant="card"
                      label={identityDocumentCardLabel(doc.label, doc.required)}
                      required={doc.required}
                      fileName={meta.fileName}
                      uploading={meta.uploading}
                      pendingFileName={meta.pendingFileName}
                      onSelectFile={(file) => uploadDoc("identity", doc.code, file)}
                    />
                  );
                })}
              </div>
              <div className="mx-auto grid w-full max-w-4xl grid-cols-1 items-stretch gap-4 sm:grid-cols-3">
                {ONBOARDING_IDENTITY_DOCUMENTS.filter((doc) =>
                  IDENTITY_OPTIONAL_CODES.has(doc.code),
                ).map((doc) => {
                  const meta = uploadMeta("identity", doc.code);
                  return (
                    <OnboardingDocumentUpload
                      key={doc.code}
                      variant="card"
                      label={identityDocumentCardLabel(doc.label, doc.required)}
                      required={doc.required}
                      fileName={meta.fileName}
                      uploading={meta.uploading}
                      pendingFileName={meta.pendingFileName}
                      onSelectFile={(file) => uploadDoc("identity", doc.code, file)}
                    />
                  );
                })}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <FieldLabel label="Aadhaar number" required />
                  <Input
                    className={wizardInputClassName}
                    inputMode="numeric"
                    maxLength={12}
                    placeholder="12-digit Aadhaar number"
                    value={form.aadhaar ?? readSectionField(sectionData.aadhaar)}
                    onChange={(e) => updateField("aadhaar", sanitizeAadhaar(e.target.value))}
                  />
                  <p className="text-[11px] text-muted-foreground">12 digits only</p>
                </div>
                <div className="space-y-1.5">
                  <FieldLabel label="PAN" required />
                  <Input
                    className={cn(wizardInputClassName, "uppercase")}
                    maxLength={10}
                    placeholder="ABCDE1234F"
                    value={form.pan ?? readSectionField(sectionData.pan)}
                    onChange={(e) => updateField("pan", sanitizePan(e.target.value))}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    10 characters — 5 letters, 4 digits, 1 letter
                  </p>
                </div>
              </div>
            </div>
          )}

          {sectionKey === "education" && (
            <OnboardingEducationSection
              form={educationForm}
              onFormChange={(updater) =>
                setEducationForm((prev) =>
                  typeof updater === "function" ? updater(prev) : updater,
                )
              }
              onUpload={(documentCode, file) => uploadDoc("education", documentCode, file)}
              getUploadMeta={(documentCode) => uploadMeta("education", documentCode)}
            />
          )}

          {sectionKey === "employment_history" && (
            <OnboardingEmploymentSection
              form={employmentForm}
              onFormChange={(updater) =>
                setEmploymentForm((prev) =>
                  typeof updater === "function" ? updater(prev) : updater,
                )
              }
              onUpload={(documentCode, file) => uploadDoc("employment", documentCode, file)}
              getUploadMeta={(documentCode) => uploadMeta("employment", documentCode)}
            />
          )}

          {sectionKey === "bank" && (
            <div className="space-y-6">
              <div className="grid min-w-0 gap-4 lg:grid-cols-3">
                <div className="space-y-1.5">
                  <FieldLabel label="Account holder name" required />
                  <Input
                    className={wizardInputClassName}
                    value={
                      form.accountHolderName ??
                      (readSectionField(sectionData.accountHolderName) || context.fullName)
                    }
                    onChange={(e) => updateField("accountHolderName", e.target.value)}
                    placeholder="Name as per bank records"
                  />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel label="Bank name" required />
                  <Input
                    className={wizardInputClassName}
                    value={form.bankName ?? readSectionField(sectionData.bankName)}
                    onChange={(e) => updateField("bankName", e.target.value)}
                    placeholder="Bank name"
                  />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel label="Account number" required />
                  <Input
                    className={wizardInputClassName}
                    inputMode="numeric"
                    maxLength={18}
                    value={form.accountNumber ?? readSectionField(sectionData.accountNumber)}
                    onChange={(e) =>
                      updateField("accountNumber", sanitizeAccountNumber(e.target.value))
                    }
                    placeholder="Account number"
                  />
                </div>
              </div>

              <div className="grid min-w-0 gap-4 lg:grid-cols-3">
                <div className="space-y-1.5">
                  <FieldLabel label="IFSC code" required />
                  <Input
                    className={cn(wizardInputClassName, "uppercase")}
                    maxLength={11}
                    value={form.ifsc ?? readSectionField(sectionData.ifsc)}
                    onChange={(e) => updateField("ifsc", sanitizeIfsc(e.target.value))}
                    placeholder="ABCD0123456"
                  />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel label="Branch name" required />
                  <Input
                    className={wizardInputClassName}
                    value={form.branchName ?? readSectionField(sectionData.branchName)}
                    onChange={(e) => updateField("branchName", e.target.value)}
                    placeholder="Branch name"
                  />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel label="Account type" required />
                  <OnboardingWizardSelect
                    items={BANK_ACCOUNT_TYPE_ITEMS}
                    value={personalSelectValue(
                      "accountType",
                      ONBOARDING_BANK_ACCOUNT_TYPE_OPTIONS,
                    )}
                    placeholder="Savings / Current"
                    onValueChange={(value) => updateField("accountType", value)}
                    triggerClassName={wizardInputClassName}
                  />
                </div>
              </div>

              <div className="mx-auto w-full max-w-sm">
                <OnboardingDocumentUpload
                  variant="card"
                  label="Cancelled Cheque — optional"
                  fileName={uploadMeta("bank", "cancelled_cheque").fileName}
                  uploading={uploadMeta("bank", "cancelled_cheque").uploading}
                  pendingFileName={uploadMeta("bank", "cancelled_cheque").pendingFileName}
                  onSelectFile={(file) => uploadDoc("bank", "cancelled_cheque", file)}
                />
              </div>
            </div>
          )}

          {sectionKey === "terms" && (
            <OnboardingTermsSection
              accepted={
                form.termsAccepted === "true" || sectionData.termsAccepted === true
              }
              onAcceptedChange={(checked) =>
                updateField("termsAccepted", checked ? "true" : "")
              }
            />
          )}

          {sectionKey === "signature" && (
            <div className="mx-auto max-w-2xl">
              <OnboardingSignature
              fullName={context.fullName}
              disabled={Boolean(context.signature)}
              onSave={async (payload) => {
                const result = await saveCandidateSignatureAction({
                  caseId: context.caseId,
                  ...payload,
                });
                if (!result.success) toast.error(result.message);
                else {
                  toast.success("Signature saved");
                  onRefresh();
                }
              }}
            />
            </div>
          )}

          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 border-t border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Button
            variant="outline"
            disabled={step === 0 || isPending}
            onClick={() => {
              setForm({});
              setStepAnimKey((k) => k + 1);
              setStep((s) => s - 1);
            }}
            className="w-full sm:w-auto"
          >
            Previous
          </Button>

          <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
            {sectionKey !== "signature" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => saveSection(false)}
                disabled={isPending}
                className="w-full sm:w-auto"
              >
                Save progress
              </Button>
            ) : null}

            {isLastStep ? (
              <Button
                onClick={submitAll}
                disabled={isPending || !submitValidation.valid}
                className="w-full sm:w-auto"
              >
                Submit for HR review
              </Button>
            ) : (
              <Button
                onClick={goNext}
                disabled={isPending || !currentValidation.valid}
                className="w-full sm:w-auto"
              >
                Next
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
