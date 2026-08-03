"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import { OnboardingSignature } from "@/components/onboarding/candidate/onboarding-signature";
import { OnboardingStepNav } from "@/components/onboarding/candidate/onboarding-step-nav";
import { OnboardingSubmittedCelebration } from "@/components/onboarding/candidate/onboarding-submitted-celebration";
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
  canNavigateToStep,
  canSubmitOnboarding,
  getCompletedStepIndices,
  getFirstIncompleteStepIndex,
  validateOnboardingSection,
} from "@/lib/onboarding/onboarding-section-validation";
import {
  ONBOARDING_AGREEMENT_TYPES,
  ONBOARDING_EMPLOYMENT_DOCUMENTS,
  ONBOARDING_IDENTITY_DOCUMENTS,
  ONBOARDING_POLICY_DOCUMENTS,
  ONBOARDING_WIZARD_SECTIONS,
} from "@/types/onboarding";
import type { CandidatePortalContext } from "@/types/onboarding";

const UPLOAD_ACCEPT =
  ".pdf,.doc,.docx,.xls,.xlsx,.zip,image/jpeg,image/png,image/webp";

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

const PERSONAL_FIELDS: { key: string; label: string; required?: boolean }[] = [
  { key: "fullName", label: "Full name", required: true },
  { key: "dateOfBirth", label: "Date of birth", required: true },
  { key: "gender", label: "Gender", required: true },
  { key: "maritalStatus", label: "Marital status" },
  { key: "bloodGroup", label: "Blood group" },
  { key: "nationality", label: "Nationality" },
  { key: "address", label: "Address", required: true },
  { key: "emergencyContact", label: "Emergency contact", required: true },
  { key: "personalMobile", label: "Personal mobile", required: true },
  { key: "personalEmail", label: "Personal email", required: true },
];

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
      {required ? <span className="text-destructive"> *</span> : null}
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

  const completedSteps = useMemo(() => getCompletedStepIndices(context), [context]);
  const firstIncompleteStep = useMemo(() => getFirstIncompleteStepIndex(context), [context]);
  const currentValidation = useMemo(
    () => validateOnboardingSection(sectionKey, context, form),
    [sectionKey, context, form],
  );
  const submitValidation = useMemo(() => canSubmitOnboarding(context), [context]);

  useEffect(() => {
    if (!initializedRef.current) {
      setStep(getFirstIncompleteStepIndex(context));
      initializedRef.current = true;
    }
  }, [context]);

  function updateField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function showValidationError(result: { missing: string[] }) {
    if (result.missing.length <= 3) {
      toast.error(`Please complete: ${result.missing.join(", ")}`);
    } else {
      toast.error(`Please complete ${result.missing.length} required items in this section`);
    }
  }

  function saveSection(markComplete = true) {
    const validation = validateOnboardingSection(sectionKey, context, form);
    if (markComplete && !validation.valid) {
      showValidationError(validation);
      return;
    }

    startTransition(async () => {
      const merged = { ...sectionData, ...form };
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
    setStep(index);
  }

  async function markSectionCompleteIfNeeded() {
    if (sectionKey === "policies" || sectionKey === "agreements") {
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
    const validation = validateOnboardingSection(sectionKey, context, form);
    if (!validation.valid) {
      showValidationError(validation);
      return;
    }

    const isFormSection =
      sectionKey !== "policies" && sectionKey !== "agreements" && sectionKey !== "signature";

    startTransition(async () => {
      try {
        if (isFormSection) {
          const merged = { ...sectionData, ...form };
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

        if (step < ONBOARDING_WIZARD_SECTIONS.length - 1) {
          setStep((s) => s + 1);
        }
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
    <div className="mx-auto w-full max-w-6xl">
      <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-lg shadow-slate-900/[0.04] ring-1 ring-black/[0.03]">
        <OnboardingStepNav
          activeStep={step}
          completedSteps={completedSteps}
          context={context}
          onStepChange={goToStep}
        />

        <div className="onboarding-section-enter px-5 py-6 sm:px-8 sm:py-8">
          <div className="mb-6 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Step {step + 1} of {ONBOARDING_WIZARD_SECTIONS.length}
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
              {SECTION_TITLES[sectionKey]}
            </h2>
            {!currentValidation.valid ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Complete required fields (
                <span className="text-destructive">*</span>) to unlock the next section
              </p>
            ) : step < firstIncompleteStep ? (
              <p className="mt-2 text-sm text-emerald-600 font-medium">Section completed</p>
            ) : (
              <p className="mt-2 text-sm text-emerald-600 font-medium">
                Ready — continue to the next section
              </p>
            )}
          </div>

          {sectionKey === "personal" && (
            <div className="grid gap-4 sm:grid-cols-2">
              {PERSONAL_FIELDS.map(({ key, label, required }) => (
                <div key={key} className="space-y-1.5">
                  <FieldLabel label={label} required={required} />
                  <Input
                    value={form[key] ?? String(sectionData[key] ?? "")}
                    onChange={(e) => updateField(key, e.target.value)}
                  />
                </div>
              ))}
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
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { key: "ssc", label: "SSC", required: true },
                { key: "intermediate", label: "Intermediate", required: true },
                { key: "graduation", label: "Graduation", required: true },
                { key: "postGraduation", label: "Post graduation" },
                { key: "certifications", label: "Certifications" },
              ].map(({ key, label, required }) => (
                <div key={key} className="space-y-1.5 sm:col-span-2 last:sm:col-span-1">
                  <FieldLabel label={label} required={required} />
                  <Input
                    value={form[key] ?? String(sectionData[key] ?? "")}
                    onChange={(e) => updateField(key, e.target.value)}
                  />
                </div>
              ))}
            </div>
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
                    value={form[key] ?? String(sectionData[key] ?? "")}
                    onChange={(e) => updateField(key, e.target.value)}
                  />
                </div>
              ))}
              <div className="space-y-2 sm:col-span-2 rounded-xl border bg-muted/20 p-4">
                <FieldLabel label="Cancelled cheque" required />
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
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { key: "taxPan", label: "PAN", required: true },
                { key: "taxAadhaar", label: "Aadhaar", required: true },
                { key: "taxDeclaration", label: "Tax declaration", required: true },
              ].map(({ key, label, required }) => (
                <div key={key} className="space-y-1.5 sm:col-span-2 last:sm:col-span-1">
                  <FieldLabel label={label} required={required} />
                  <Input
                    value={form[key] ?? String(sectionData[key] ?? "")}
                    onChange={(e) => updateField(key, e.target.value)}
                  />
                </div>
              ))}
            </div>
          )}

          {sectionKey === "policies" && (
            <div className="space-y-3">
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
            <div className="space-y-3">
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
          )}

          {sectionKey !== "policies" &&
            sectionKey !== "agreements" &&
            sectionKey !== "signature" && (
              <div className="mt-8 flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => saveSection(false)}
                  disabled={isPending}
                >
                  Save progress
                </Button>
              </div>
            )}
        </div>

        <div className="flex flex-col gap-4 border-t border-border/60 bg-gradient-to-b from-slate-50/80 to-slate-50/40 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <Button
            variant="outline"
            disabled={step === 0 || isPending}
            onClick={() => {
              setForm({});
              setStep((s) => s - 1);
            }}
            className="w-full sm:w-auto"
          >
            Previous
          </Button>

          <div className="text-center text-xs text-muted-foreground sm:order-none">
            Step {step + 1} of {ONBOARDING_WIZARD_SECTIONS.length} · {context.completionPercent}%
            complete
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
