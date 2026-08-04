"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
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
import { ONBOARDING_UPLOAD_MAX_MB } from "@/lib/onboarding/constants";
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
import { educationDocumentTypeCode, parseEducationEntries } from "@/lib/onboarding/education-utils";
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
  type OnboardingEducationEntry,
} from "@/types/onboarding";
import type { CandidatePortalContext } from "@/types/onboarding";

const UPLOAD_ACCEPT =
  ".pdf,.doc,.docx,.xls,.xlsx,.zip,image/jpeg,image/png,image/webp";

function formatJoiningDate(value: string | null) {
  if (!value) return "To be confirmed";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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

function UploadHint() {
  return (
    <p className="mt-1.5 text-xs text-muted-foreground">
      PDF, Word, Excel, images, or ZIP · max {ONBOARDING_UPLOAD_MAX_MB} MB
    </p>
  );
}

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
  category: string,
  code: string,
): boolean {
  return context.documents.some(
    (doc) => doc.documentCategory === category && doc.documentTypeCode === code,
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
  const sectionKey = ONBOARDING_WIZARD_SECTIONS[step];
  const sectionData = context.sections.find((s) => s.sectionKey === sectionKey)?.data ?? {};
  const [form, setForm] = useState<Record<string, string>>({});
  const [educationEntries, setEducationEntries] = useState<OnboardingEducationEntry[]>([]);
  const [stepAnimKey, setStepAnimKey] = useState(0);

  const completedSteps = useMemo(() => getCompletedStepIndices(context), [context]);
  const firstIncompleteStep = useMemo(() => getFirstIncompleteStepIndex(context), [context]);
  const currentValidation = useMemo(() => {
    if (sectionKey === "education") {
      return validateEducationSection(context, educationEntries);
    }
    return validateOnboardingSection(sectionKey, context, form);
  }, [sectionKey, context, form, educationEntries]);
  const submitValidation = useMemo(() => canSubmitOnboarding(context), [context]);

  useEffect(() => {
    if (!initializedRef.current) {
      setStep(getFirstIncompleteStepIndex(context));
      initializedRef.current = true;
    }
  }, [context]);

  useEffect(() => {
    if (sectionKey === "education") {
      setEducationEntries(parseEducationEntries(sectionData));
    }
  }, [sectionKey, sectionData]);

  function sectionPayload(): Record<string, unknown> {
    if (sectionKey === "education") {
      return { ...sectionData, entries: educationEntries };
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
        ? validateEducationSection(context, educationEntries)
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

  function uploadDoc(documentCategory: string, documentTypeCode: string, file: File) {
    const fd = new FormData();
    fd.set("file", file);
    fd.set("documentCategory", documentCategory);
    fd.set("documentTypeCode", documentTypeCode);
    startTransition(async () => {
      const result = await uploadCandidateDocumentAction(fd);
      toast[result.success ? "success" : "error"](result.message);
      if (result.success) onRefresh();
    });
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
        ? validateEducationSection(context, educationEntries)
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
          setForm({});
        } else {
          await markSectionCompleteIfNeeded();
        }

        await onRefresh();
        advanceStep();
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
    <div className="mx-auto flex w-full max-w-6xl flex-col max-h-[calc(100dvh-3.25rem)] min-h-0">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-lg shadow-slate-900/[0.04] ring-1 ring-black/[0.03]">
        <OnboardingPortalHero
          fullName={context.fullName}
          joiningDateLabel={formatJoiningDate(context.joiningDate)}
          completionPercent={context.completionPercent}
        />

        <OnboardingStepNav
          activeStep={step}
          completedSteps={completedSteps}
          context={context}
          onStepChange={goToStep}
        />

        <div
          key={`${sectionKey}-${stepAnimKey}`}
          className="onboarding-section-enter min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5"
        >
          <div className="mb-4 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Step {step + 1} of {ONBOARDING_WIZARD_SECTIONS.length}
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight sm:text-xl">
              {SECTION_TITLES[sectionKey]}
            </h2>
            {!currentValidation.valid ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Complete required fields (
                <span className="text-foreground">*</span>) to unlock the next section
              </p>
            ) : step < firstIncompleteStep ? (
              <p className="mt-1 text-xs font-medium text-emerald-600">Section completed</p>
            ) : (
              <p className="mt-1 text-xs font-medium text-emerald-600">
                Ready — continue to the next section
              </p>
            )}
          </div>

          {sectionKey === "personal" && (
            <div className="grid gap-2.5 sm:grid-cols-2">
              <div className="space-y-1">
                <FieldLabel label="Full name" required />
                <Input
                  className="h-9 text-sm"
                  value={personalField("fullName")}
                  onChange={(e) => updateField("fullName", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <FieldLabel label="Date of birth" required />
                <Input
                  type="date"
                  className="h-9 text-sm"
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
                  triggerClassName="h-9 w-full text-sm"
                />
              </div>
              <div className="space-y-1">
                <FieldLabel label="Marital status" />
                <LabeledSelect
                  items={MARITAL_ITEMS}
                  value={personalSelectValue("maritalStatus", ONBOARDING_MARITAL_STATUS_OPTIONS)}
                  placeholder="Select marital status"
                  onValueChange={(value) => updateField("maritalStatus", value)}
                  triggerClassName="h-9 w-full text-sm"
                />
              </div>
              <div className="space-y-1">
                <FieldLabel label="Blood group" />
                <LabeledSelect
                  items={BLOOD_GROUP_ITEMS}
                  value={personalSelectValue("bloodGroup", ONBOARDING_BLOOD_GROUP_OPTIONS)}
                  placeholder="Select blood group"
                  onValueChange={(value) => updateField("bloodGroup", value)}
                  triggerClassName="h-9 w-full text-sm"
                />
              </div>
              <div className="space-y-1">
                <FieldLabel label="Nationality" />
                <Input
                  className="h-9 text-sm"
                  value={personalField("nationality")}
                  onChange={(e) => updateField("nationality", e.target.value)}
                  placeholder="Nationality"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <FieldLabel label="Address" required />
                <Input
                  className="h-9 text-sm"
                  value={personalField("address")}
                  onChange={(e) => updateField("address", e.target.value)}
                />
              </div>
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
                  className="h-9 text-sm"
                  value={personalField("personalEmail")}
                  onChange={(e) => updateField("personalEmail", e.target.value)}
                />
              </div>
            </div>
          )}

          {sectionKey === "identity" && (
            <div className="space-y-5">
              {ONBOARDING_IDENTITY_DOCUMENTS.map((doc) => {
                const uploaded = documentUploaded(context, "identity", doc.code);
                return (
                  <div
                    key={doc.code}
                    className="rounded-xl border bg-muted/20 p-4 space-y-2"
                  >
                    <FieldLabel label={doc.label} required={doc.required} />
                    {uploaded ? (
                      <p className="text-xs font-medium text-emerald-600">Uploaded</p>
                    ) : null}
                    <Input
                      type="file"
                      accept={UPLOAD_ACCEPT}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadDoc("identity", doc.code, file);
                      }}
                    />
                    <UploadHint />
                  </div>
                );
              })}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <FieldLabel label="Aadhaar number" required />
                  <Input
                    value={form.aadhaar ?? String(sectionData.aadhaar ?? "")}
                    onChange={(e) => updateField("aadhaar", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel label="PAN" required />
                  <Input
                    value={form.pan ?? String(sectionData.pan ?? "")}
                    onChange={(e) => updateField("pan", e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {sectionKey === "education" && (
            <OnboardingEducationSection
              context={context}
              entries={educationEntries}
              onEntriesChange={setEducationEntries}
              onUpload={(entryId, file) =>
                uploadDoc("education", educationDocumentTypeCode(entryId), file)
              }
            />
          )}

          {sectionKey === "employment_history" && (
            <div className="space-y-4">
              {ONBOARDING_EMPLOYMENT_DOCUMENTS.map((doc) => {
                const uploaded = documentUploaded(context, "employment", doc.code);
                return (
                  <div
                    key={doc.code}
                    className="rounded-xl border bg-muted/20 p-4 space-y-2"
                  >
                    <FieldLabel label={doc.label} required={doc.required} />
                    {uploaded ? (
                      <p className="text-xs font-medium text-emerald-600">Uploaded</p>
                    ) : null}
                    <Input
                      type="file"
                      accept={UPLOAD_ACCEPT}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadDoc("employment", doc.code, file);
                      }}
                    />
                    <UploadHint />
                  </div>
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
                    className="h-9 text-sm"
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
              <div className="space-y-2 sm:col-span-2 rounded-xl border bg-muted/20 p-4">
                <FieldLabel label="Cancelled cheque" />
                {documentUploaded(context, "bank", "cancelled_cheque") ? (
                  <p className="text-xs font-medium text-emerald-600">Uploaded</p>
                ) : null}
                <Input
                  type="file"
                  accept={UPLOAD_ACCEPT}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadDoc("bank", "cancelled_cheque", file);
                  }}
                />
                <UploadHint />
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
                      className="h-9 text-sm"
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

        <div className="flex shrink-0 flex-col gap-2 border-t border-border/60 bg-slate-50/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
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
