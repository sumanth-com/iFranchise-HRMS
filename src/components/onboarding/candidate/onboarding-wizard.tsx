"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import { OnboardingAddressFields } from "@/components/onboarding/candidate/onboarding-address-fields";
import { OnboardingDocumentUpload } from "@/components/onboarding/candidate/onboarding-document-upload";
import { OnboardingEducationSection } from "@/components/onboarding/candidate/onboarding-education-section";
import { OnboardingPhoneField } from "@/components/onboarding/candidate/onboarding-phone-field";
import { OnboardingPortalHero } from "@/components/onboarding/candidate/onboarding-portal-hero";
import { OnboardingSignature } from "@/components/onboarding/candidate/onboarding-signature";
import { OnboardingStepNav } from "@/components/onboarding/candidate/onboarding-step-nav";
import { OnboardingSubmittedCelebration } from "@/components/onboarding/candidate/onboarding-submitted-celebration";
import { LabeledSelect } from "@/components/payroll/payroll-select";
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
  canNavigateToStep,
  canSubmitOnboarding,
  getCompletedStepIndices,
  getFirstIncompleteStepIndex,
  validateEducationSection,
  validateOnboardingSection,
} from "@/lib/onboarding/onboarding-section-validation";
import {
  ONBOARDING_AGREEMENT_TYPES,
  ONBOARDING_EMPLOYMENT_DOCUMENTS,
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
  personal: "Personal Information",
  identity: "Identity Documents",
  education: "Education",
  employment_history: "Previous Employment",
  bank: "Bank Details",
  tax: "Tax Information",
  policies: "Company Policies",
  agreements: "Employment Agreements",
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
  const [step, setStep] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [showCelebration, setShowCelebration] = useState(false);
  const initializedRef = useRef(false);
  const contentScrollRef = useRef<HTMLDivElement>(null);
  const prevSectionKeyRef = useRef<string | null>(null);
  const sectionKey = ONBOARDING_WIZARD_SECTIONS[step];
  const sectionData = context.sections.find((s) => s.sectionKey === sectionKey)?.data ?? {};
  const [form, setForm] = useState<Record<string, string>>({});
  const [educationForm, setEducationForm] = useState<OnboardingEducationFormData>(() =>
    createEmptyEducationForm(),
  );
  const [stepAnimKey, setStepAnimKey] = useState(0);
  const [uploadSlots, setUploadSlots] = useState<
    Record<string, { uploading: boolean; pendingFileName?: string }>
  >({});

  const completedSteps = useMemo(() => getCompletedStepIndices(context), [context]);
  const firstIncompleteStep = useMemo(() => getFirstIncompleteStepIndex(context), [context]);
  const currentValidation = useMemo(() => {
    if (sectionKey === "education") {
      return validateEducationSection(context, educationForm);
    }
    return validateOnboardingSection(sectionKey, context, form);
  }, [sectionKey, context, form, educationForm]);
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
      setEducationForm(parseEducationForm(sectionData));
    }
  }, [sectionKey, sectionData]);

  useEffect(() => {
    contentScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [step, stepAnimKey]);

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
    return { ...sectionData, ...form };
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
    return form[key] ?? String(sectionData[key] ?? "");
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
    const validation =
      sectionKey === "education"
        ? validateEducationSection(context, educationForm)
        : validateOnboardingSection(sectionKey, context, form);
    if (markComplete && !validation.valid) {
      showValidationError(validation);
      return;
    }

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
    if (!canNavigateToStep(index, context)) {
      toast.error("Complete the current section before opening the next step");
      return;
    }
    setForm({});
    setStepAnimKey((k) => k + 1);
    setStep(index);
  }

  async function markSectionCompleteIfNeeded() {
    if (
      sectionKey === "policies" ||
      sectionKey === "agreements" ||
      sectionKey === "signature"
    ) {
      const result = await saveCandidateSectionAction({
        caseId: context.caseId,
        sectionKey,
        data: sectionData,
        markComplete: true,
      });
      if (!result.success) throw new Error(result.message);
    }
  }

  function goNext() {
    const validation =
      sectionKey === "education"
        ? validateEducationSection(context, educationForm)
        : validateOnboardingSection(sectionKey, context, form);
    if (!validation.valid) {
      showValidationError(validation);
      return;
    }

    const isFormSection =
      sectionKey !== "policies" && sectionKey !== "agreements" && sectionKey !== "signature";

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
    <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-lg shadow-black/5 ring-1 ring-border/50 dark:shadow-black/25">
        <OnboardingPortalHero
          fullName={context.fullName}
          completionPercent={context.completionPercent}
        />

        <OnboardingStepNav
          activeStep={step}
          completedSteps={completedSteps}
          context={context}
          onStepChange={goToStep}
        />

        <div
          ref={contentScrollRef}
          key={`${sectionKey}-${stepAnimKey}`}
          className="onboarding-section-enter min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5"
        >
          <div className="mb-4 flex items-center justify-between gap-3 border-b border-border/60 pb-3">
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
            <p className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Step {step + 1} of {ONBOARDING_WIZARD_SECTIONS.length}
            </p>
          </div>

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
                <LabeledSelect
                  items={GENDER_ITEMS}
                  value={personalSelectValue("gender", ONBOARDING_GENDER_OPTIONS)}
                  placeholder="Select gender"
                  onValueChange={(value) => updateField("gender", value)}
                  triggerClassName={cn(wizardInputClassName, "w-full")}
                />
              </div>
              <div className="space-y-1">
                <FieldLabel label="Marital status" />
                <LabeledSelect
                  items={MARITAL_ITEMS}
                  value={personalSelectValue("maritalStatus", ONBOARDING_MARITAL_STATUS_OPTIONS)}
                  placeholder="Select marital status"
                  onValueChange={(value) => updateField("maritalStatus", value)}
                  triggerClassName={cn(wizardInputClassName, "w-full")}
                />
              </div>
              <div className="space-y-1">
                <FieldLabel label="Blood group" />
                <LabeledSelect
                  items={BLOOD_GROUP_ITEMS}
                  value={personalSelectValue("bloodGroup", ONBOARDING_BLOOD_GROUP_OPTIONS)}
                  placeholder="Select blood group"
                  onValueChange={(value) => updateField("bloodGroup", value)}
                  triggerClassName={cn(wizardInputClassName, "w-full")}
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
                  String(sectionData.addressLine ?? sectionData.address ?? "")
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
                value={personalField("personalMobile")}
                onChange={(value) => updateField("personalMobile", value)}
                placeholder="Mobile number"
              />
              <OnboardingPhoneField
                label="Emergency contact"
                required
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
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-3">
                {ONBOARDING_IDENTITY_DOCUMENTS.map((doc) => {
                  const meta = uploadMeta("identity", doc.code);
                  return (
                    <OnboardingDocumentUpload
                      key={doc.code}
                      variant="card"
                      label={doc.label}
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
                    value={form.aadhaar ?? String(sectionData.aadhaar ?? "")}
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
                    value={form.pan ?? String(sectionData.pan ?? "")}
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
            <div className="space-y-4">
              {ONBOARDING_EMPLOYMENT_DOCUMENTS.map((doc) => {
                const meta = uploadMeta("employment", doc.code);
                return (
                  <OnboardingDocumentUpload
                    key={doc.code}
                    label={doc.label}
                    required={doc.required}
                    fileName={meta.fileName}
                    uploading={meta.uploading}
                    pendingFileName={meta.pendingFileName}
                    onSelectFile={(file) => uploadDoc("employment", doc.code, file)}
                  />
                );
              })}
            </div>
          )}

          {sectionKey === "bank" && (
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { key: "bankName", label: "Bank name", required: true },
                { key: "accountNumber", label: "Account number", required: true },
                { key: "ifsc", label: "IFSC", required: true },
              ].map(({ key, label, required }) => (
                <div key={key} className="space-y-1.5">
                  <FieldLabel label={label} required={required} />
                  <Input
                    className={wizardInputClassName}
                    value={form[key] ?? String(sectionData[key] ?? "")}
                    onChange={(e) => {
                      if (key === "accountNumber") {
                        updateField(key, sanitizeAccountNumber(e.target.value));
                      } else if (key === "ifsc") {
                        updateField(key, sanitizeIfsc(e.target.value));
                      } else {
                        updateField(key, e.target.value);
                      }
                    }}
                    inputMode={key === "accountNumber" ? "numeric" : undefined}
                    maxLength={key === "accountNumber" ? 18 : key === "ifsc" ? 11 : undefined}
                  />
                </div>
              ))}
              <div className="sm:col-span-2">
                <OnboardingDocumentUpload
                  label="Cancelled cheque"
                  fileName={uploadMeta("bank", "cancelled_cheque").fileName}
                  uploading={uploadMeta("bank", "cancelled_cheque").uploading}
                  pendingFileName={uploadMeta("bank", "cancelled_cheque").pendingFileName}
                  onSelectFile={(file) => uploadDoc("bank", "cancelled_cheque", file)}
                />
              </div>
            </div>
          )}

          {sectionKey === "tax" && (
            <div className="mx-auto max-w-lg space-y-4">
              <p className="text-center text-sm text-muted-foreground">
                Optional — add tax details if you have them. You can skip this section.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { key: "taxPan", label: "PAN" },
                  { key: "taxAadhaar", label: "Aadhaar" },
                  { key: "taxDeclaration", label: "Tax declaration" },
                ].map(({ key, label }) => (
                  <div key={key} className="space-y-1.5 sm:col-span-2 last:sm:col-span-1">
                    <FieldLabel label={label} />
                    <Input
                      className={wizardInputClassName}
                      value={form[key] ?? String(sectionData[key] ?? "")}
                      onChange={(e) => updateField(key, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {sectionKey === "policies" && (
            <div className="mx-auto max-w-2xl space-y-3">
              <p className="text-center text-sm text-muted-foreground">
                Please read and acknowledge each company policy to continue.
              </p>
              {ONBOARDING_POLICY_DOCUMENTS.map((policy) => {
                const checked = context.policyAcknowledgements.includes(policy.code);
                return (
                  <label
                    key={policy.code}
                    className="flex items-start gap-3 rounded-xl border bg-muted/20 p-4 text-sm transition-colors hover:bg-muted/30"
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={checked}
                      onChange={(e) => {
                        const codes = e.target.checked
                          ? [...context.policyAcknowledgements, policy.code]
                          : context.policyAcknowledgements.filter((c) => c !== policy.code);
                        startTransition(async () => {
                          const result = await saveCandidatePoliciesAction({
                            caseId: context.caseId,
                            policyCodes: codes,
                          });
                          if (!result.success) toast.error(result.message);
                          else onRefresh();
                        });
                      }}
                    />
                    <span>I have read and acknowledge the {policy.label}</span>
                  </label>
                );
              })}
            </div>
          )}

          {sectionKey === "agreements" && (
            <div className="mx-auto max-w-2xl space-y-3">
              <p className="text-center text-sm text-muted-foreground">
                Please accept each agreement to continue.
              </p>
              {ONBOARDING_AGREEMENT_TYPES.map((agreement) => {
                const accepted = context.agreements.some(
                  (a) => a.agreementType === agreement.code,
                );
                return (
                  <label
                    key={agreement.code}
                    className="flex items-start gap-3 rounded-xl border bg-muted/20 p-4 text-sm transition-colors hover:bg-muted/30"
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={accepted}
                      onChange={(e) => {
                        const types = e.target.checked
                          ? [...context.agreements.map((a) => a.agreementType), agreement.code]
                          : context.agreements
                              .map((a) => a.agreementType)
                              .filter((c) => c !== agreement.code);
                        startTransition(async () => {
                          const result = await saveCandidateAgreementsAction({
                            caseId: context.caseId,
                            agreementTypes: types,
                          });
                          if (!result.success) toast.error(result.message);
                          else onRefresh();
                        });
                      }}
                    />
                    <span>I accept the {agreement.label}</span>
                  </label>
                );
              })}
            </div>
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

          {sectionKey !== "policies" &&
            sectionKey !== "agreements" &&
            sectionKey !== "signature" && (
              <div className="mt-4 flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => saveSection(false)}
                  disabled={isPending}
                >
                  Save progress
                </Button>
              </div>
            )}
        </div>

        <div className="flex shrink-0 flex-col gap-2 border-t border-border bg-muted/40 px-4 py-3 dark:bg-muted/20 sm:flex-row sm:items-center sm:justify-between sm:px-6">
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

          <div className="text-center text-[11px] text-muted-foreground sm:order-none">
            Step {step + 1}/{ONBOARDING_WIZARD_SECTIONS.length}
          </div>

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
  );
}
