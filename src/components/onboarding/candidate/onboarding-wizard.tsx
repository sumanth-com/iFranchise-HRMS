"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import { OnboardingDocumentUpload } from "@/components/onboarding/candidate/onboarding-document-upload";
import { OnboardingEducationSection } from "@/components/onboarding/candidate/onboarding-education-section";
import { OnboardingEmploymentSection } from "@/components/onboarding/candidate/onboarding-employment-section";
import { OnboardingPersonalSection } from "@/components/onboarding/candidate/onboarding-personal-section";
import { OnboardingTermsSection } from "@/components/onboarding/candidate/onboarding-terms-section";
import { OnboardingOfferAcceptanceSection } from "@/components/onboarding/candidate/onboarding-offer-acceptance-section";
import { useOnboardingPortalProgress } from "@/components/onboarding/candidate/onboarding-portal-progress-context";
import { OnboardingStepNav } from "@/components/onboarding/candidate/onboarding-step-nav";
import { OnboardingSubmittedCelebration } from "@/components/onboarding/candidate/onboarding-submitted-celebration";
import { OnboardingWizardSelect } from "@/components/onboarding/candidate/onboarding-wizard-select";
import {
  downloadCandidateOfferLetterAction,
  getCandidateOfferLetterUrlAction,
  saveCandidateAgreementsAction,
  saveCandidatePoliciesAction,
  saveCandidateSectionAction,
  submitCandidateOnboardingAction,
  uploadCandidateDocumentAction,
} from "@/lib/onboarding/actions/candidate-onboarding-actions";
import { ONBOARDING_STEP_LABELS } from "@/lib/onboarding/onboarding-step-labels";
import {
  ONBOARDING_OFFER_ACCEPTANCE_CATEGORY,
  ONBOARDING_SIGNED_OFFER_DOCUMENT_CODE,
} from "@/lib/onboarding/offer-acceptance-constants";
import { readOnboardingAddressLine, normalizeOnboardingSectionData } from "@/lib/onboarding/onboarding-personal-field-utils";
import {
  normalizeSelectValue,
  toIsoDate,
} from "@/lib/onboarding/personal-field-options";
import {
  getBankAccountValidationMessage,
  getIfscValidationMessage,
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
  getCompletedStepIndices,
  getFirstIncompleteStepIndex,
  isOnboardingSectionComplete,
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

/** Long enough that typing a field is a single write, short enough to feel instant. */
const AUTO_SAVE_DEBOUNCE_MS = 900;

const wizardInputClassName =
  "h-9 bg-background text-sm text-foreground caret-foreground placeholder:text-muted-foreground dark:bg-background dark:text-foreground";

function uploadSlotKey(documentCategory: string, documentTypeCode: string) {
  return `${documentCategory}:${documentTypeCode}`;
}

const SECTION_TITLES: Record<string, string> = {
  ...ONBOARDING_STEP_LABELS,
  identity: "Identity Documents",
  employment_history: "Previous Employment",
  bank: "Bank Details",
};

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
  fullName?: string | null,
  personalEmail?: string | null,
): Record<string, string> {
  const safeFullName = typeof fullName === "string" ? fullName.trim() : "";
  const safePersonalEmail = typeof personalEmail === "string" ? personalEmail.trim() : "";
  const patch: Record<string, string> = {};
  for (const [key, value] of Object.entries(saved)) {
    const text = readSectionField(value);
    if (text) patch[key] = text;
  }
  for (const [key, value] of Object.entries(draft)) {
    if (value.trim()) patch[key] = value.trim();
    else patch[key] = "";
  }

  if (sectionKey === "personal") {
    if (!patch.fullName?.trim() && safeFullName) {
      patch.fullName = safeFullName;
    }
    if (!patch.personalEmail?.trim() && safePersonalEmail) {
      patch.personalEmail = safePersonalEmail;
    }
    const dob = toIsoDate(draft.dateOfBirth ?? saved.dateOfBirth);
    if (/^\d{4}-\d{2}-\d{2}$/.test(dob)) patch.dateOfBirth = dob;

    if (!patch.addressLine?.trim()) {
      const addressLine = readOnboardingAddressLine(saved);
      if (addressLine.trim()) patch.addressLine = addressLine.trim();
    }
  }

  if (sectionKey === "bank") {
    if (!patch.accountHolderName?.trim() && safeFullName) {
      patch.accountHolderName = safeFullName;
    }
    const accountType = patch.accountType?.toLowerCase();
    if (accountType === "salary") patch.accountType = "savings";
  }

  if (sectionKey === "terms") {
    if ("termsAccepted" in draft) {
      if (draft.termsAccepted === "true") {
        patch.termsAccepted = "true";
      } else {
        delete patch.termsAccepted;
      }
    } else if (saved.termsAccepted === true || saved.termsAccepted === "true") {
      patch.termsAccepted = "true";
    }
  }

  if (sectionKey === "signature") {
    if ("offerAccepted" in draft) {
      if (draft.offerAccepted === "true") {
        patch.offerAccepted = "true";
      } else {
        delete patch.offerAccepted;
      }
    } else if (saved.offerAccepted === true || saved.offerAccepted === "true") {
      patch.offerAccepted = "true";
    }
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

function FieldHint({ error }: { error?: string | null }) {
  if (!error) return null;
  return <p className="text-[11px] font-medium text-destructive">{error}</p>;
}

type OnboardingWizardProps = {
  context: CandidatePortalContext;
  onRefresh: () => void | Promise<void>;
};

export function OnboardingWizard({ context, onRefresh }: OnboardingWizardProps) {
  const setWizardStep = useOnboardingPortalProgress()?.setWizardStep;
  const [step, setStep] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [showCelebration, setShowCelebration] = useState(false);
  const initializedRef = useRef(false);
  const prevSectionKeyRef = useRef<string | null>(null);
  const sectionKey = ONBOARDING_WIZARD_SECTIONS[step];
  const sectionData = normalizeOnboardingSectionData(
    context.sections.find((s) => s.sectionKey === sectionKey)?.data,
  );
  const [form, setForm] = useState<Record<string, string>>({});
  const [educationForm, setEducationForm] = useState<OnboardingEducationFormData>(() =>
    createEmptyEducationForm(),
  );
  const [employmentForm, setEmploymentForm] = useState<OnboardingEmploymentFormData>(() =>
    createEmptyEmploymentForm(),
  );
  const [stepAnimKey, setStepAnimKey] = useState(0);
  const [uploadSlots, setUploadSlots] = useState<
    Record<string, { uploading: boolean; pendingFileName?: string; error?: string }>
  >({});
  const contentScrollRef = useRef<HTMLDivElement>(null);
  const [autoSaveState, setAutoSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Writes are chained rather than fired in parallel, so a slower earlier save can
  // never land after a newer one and clobber more recent input.
  const saveChainRef = useRef<Promise<void>>(Promise.resolve());

  const contextWithOptimisticDocs = useMemo(() => {
    const extras = Object.entries(uploadSlots)
      .filter(([, slot]) => Boolean(slot.pendingFileName))
      .flatMap(([key, slot]) => {
        const separator = key.indexOf(":");
        if (separator <= 0) return [];
        const documentCategory = key.slice(0, separator);
        const documentTypeCode = key.slice(separator + 1);
        if (
          context.documents.some(
            (doc) =>
              doc.documentCategory === documentCategory &&
              doc.documentTypeCode === documentTypeCode,
          )
        ) {
          return [];
        }
        return [
          {
            id: `optimistic:${key}`,
            documentCategory,
            documentTypeCode,
            fileName: slot.pendingFileName ?? "Uploaded",
            fileSize: null,
            reviewStatus: "pending" as const,
            hrComment: null,
            reviewedAt: null,
          },
        ];
      });

    if (extras.length === 0) return context;
    return {
      ...context,
      documents: [...context.documents, ...extras],
    };
  }, [context, uploadSlots]);

  // Drop local upload slots once the server context includes the saved document.
  useEffect(() => {
    const savedKeys = new Set(
      context.documents.map((doc) => uploadSlotKey(doc.documentCategory, doc.documentTypeCode)),
    );
    setUploadSlots((prev) => {
      if (Object.keys(prev).length === 0) return prev;
      const next = { ...prev };
      let changed = false;
      for (const [key, slot] of Object.entries(prev)) {
        if (slot.uploading || !savedKeys.has(key)) continue;
        delete next[key];
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [context.documents]);

  const completedSteps = useMemo(
    () => getCompletedStepIndices(contextWithOptimisticDocs),
    [contextWithOptimisticDocs],
  );
  const firstIncompleteStep = useMemo(
    () => getFirstIncompleteStepIndex(contextWithOptimisticDocs),
    [contextWithOptimisticDocs],
  );
  const liveSectionPatch = useMemo(
    () =>
      buildLiveSectionPatch(
        sectionKey,
        sectionData,
        form,
        context.fullName,
        context.personalEmail,
      ),
    [sectionKey, sectionData, form, context.fullName, context.personalEmail],
  );

  function validateCurrentSection() {
    if (sectionKey === "education") {
      return validateEducationSection(contextWithOptimisticDocs, educationForm);
    }
    if (sectionKey === "employment_history") {
      return validateEmploymentSection(contextWithOptimisticDocs, employmentForm);
    }
    return validateOnboardingSection(
      sectionKey,
      contextWithOptimisticDocs,
      liveSectionPatch,
    );
  }

  const currentValidation = useMemo(
    () => validateCurrentSection(),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- liveSectionPatch captures form + saved fields
    [sectionKey, contextWithOptimisticDocs, liveSectionPatch, educationForm, employmentForm],
  );
  const submitValidation = useMemo(() => {
    const missing: string[] = [];
    for (const key of ONBOARDING_WIZARD_SECTIONS) {
      const patch = key === sectionKey ? liveSectionPatch : undefined;
      missing.push(
        ...validateOnboardingSection(key, contextWithOptimisticDocs, patch).missing,
      );
    }
    return { valid: missing.length === 0, missing };
  }, [contextWithOptimisticDocs, sectionKey, liveSectionPatch]);

  const correctionSteps = useMemo(() => {
    const indices: number[] = [];
    ONBOARDING_WIZARD_SECTIONS.forEach((sKey, sIdx) => {
      const hasCorrection = (context.documents ?? []).some((d) => {
        if (d.reviewStatus !== "correction_requested") return false;
        if (sKey === "identity" && d.documentCategory === "identity") return true;
        if (sKey === "education" && d.documentCategory === "education") return true;
        if (sKey === "employment_history" && d.documentCategory === "employment") return true;
        if (sKey === "bank" && d.documentCategory === "bank") return true;
        if (
          sKey === "signature" &&
          (d.documentCategory === "offer_acceptance" || d.documentCategory === "signature")
        ) {
          return true;
        }
        return false;
      });
      if (hasCorrection) indices.push(sIdx);
    });
    return indices;
  }, [context.documents]);

  const hasCorrectionsRequested =
    context.status === "corrections_requested" || correctionSteps.length > 0;

  useEffect(() => {
    if (!initializedRef.current) {
      if (correctionSteps.length > 0) {
        setStep(correctionSteps[0]);
      } else {
        setStep(getFirstIncompleteStepIndex(context));
      }
      initializedRef.current = true;
    }
  }, [context, correctionSteps]);

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

  // Debounced auto-save: one write after the candidate pauses, not one per keystroke.
  useEffect(() => {
    if (context.locked) return;
    if (!sectionHasDraftChanges()) return;

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      autoSaveTimerRef.current = null;
      void queueAutoSave();
    }, AUTO_SAVE_DEBOUNCE_MS);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- draft state drives the debounce
  }, [form, educationForm, employmentForm, sectionKey, context.locked]);

  useEffect(() => {
    const el = contentScrollRef.current;
    if (!el) return;
    el.scrollTop = 0;
  }, [step, stepAnimKey]);

  useEffect(() => {
    if (!setWizardStep) return;
    setWizardStep({
      current: step + 1,
      total: ONBOARDING_WIZARD_SECTIONS.length,
    });
  }, [step, setWizardStep]);

  useEffect(() => {
    return () => {
      setWizardStep?.(null);
    };
  }, [setWizardStep]);

  // Next follows validation live. A section that was already completed and is
  // untouched stays passable so a later rule change cannot trap the candidate.
  const canAdvance =
    currentValidation.valid ||
    (isOnboardingSectionComplete(sectionKey, contextWithOptimisticDocs) &&
      !sectionHasDraftChanges());

  function sectionHintText(): string {
    if (!currentValidation.valid) {
      const items = currentValidation.missing;
      if (items.length === 0) {
        return "Complete required fields (*) to continue";
      }
      if (items.length === 1) return items[0];
      if (items.length === 2) return items.join(" · ");
      return `${items.slice(0, 2).join(" · ")} (+${items.length - 2} more)`;
    }
    if (step < firstIncompleteStep) {
      return "Section completed — edit if needed, then click Next to continue";
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

  /**
   * Persists the current section draft in the background. It deliberately does not
   * refetch or clear the draft: the draft is what the inputs render from, so
   * dropping it mid-flight is what made saved values briefly disappear.
   */
  async function performAutoSave() {
    if (context.locked || !sectionHasDraftChanges()) return;

    setAutoSaveState("saving");
    try {
      const result = await saveCandidateSectionAction({
        caseId: context.caseId,
        sectionKey,
        data: sectionPayload(),
        // Auto-save must never flip an already finished section back to incomplete.
        markComplete: Boolean(
          context.sections.find((s) => s.sectionKey === sectionKey)?.completedAt,
        ),
      });
      setAutoSaveState(result.success ? "saved" : "idle");
    } catch (error) {
      console.error("[onboarding-portal] auto-save failed", error);
      setAutoSaveState("idle");
    }
  }

  function queueAutoSave(): Promise<void> {
    saveChainRef.current = saveChainRef.current.then(() => performAutoSave());
    return saveChainRef.current;
  }

  /** Writes any pending draft immediately, used before navigating away. */
  async function flushAutoSave(): Promise<void> {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    if (!sectionHasDraftChanges()) return;
    await queueAutoSave();
  }

  function sectionHasDraftChanges(): boolean {
    if (sectionKey === "education") {
      try {
        return (
          JSON.stringify(educationForm) !== JSON.stringify(parseEducationForm(sectionData))
        );
      } catch {
        return true;
      }
    }
    if (sectionKey === "employment_history") {
      try {
        return (
          JSON.stringify(employmentForm) !== JSON.stringify(parseEmploymentForm(sectionData))
        );
      } catch {
        return true;
      }
    }
    if (sectionKey === "terms") {
      const savedAccepted =
        sectionData.termsAccepted === true || sectionData.termsAccepted === "true";
      return termsAcceptedLive() !== savedAccepted;
    }
    if (sectionKey === "signature") {
      const savedAccepted =
        sectionData.offerAccepted === true || sectionData.offerAccepted === "true";
      return offerAcceptedLive() !== savedAccepted;
    }
    if (Object.keys(form).length === 0) return false;
    for (const [key, value] of Object.entries(form)) {
      const saved = readSectionField(sectionData[key]);
      if (value.trim() !== saved.trim()) return true;
    }
    return false;
  }

  function termsAcceptedLive(): boolean {
    if ("termsAccepted" in form) return form.termsAccepted === "true";
    return (
      sectionData.termsAccepted === true || sectionData.termsAccepted === "true"
    );
  }

  function offerAcceptedLive(): boolean {
    if ("offerAccepted" in form) return form.offerAccepted === "true";
    return sectionData.offerAccepted === true || sectionData.offerAccepted === "true";
  }

  async function viewOfferLetter() {
    const result = await getCandidateOfferLetterUrlAction();
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    window.open(result.url, "_blank", "noopener,noreferrer");
  }

  async function downloadOfferLetter() {
    const result = await downloadCandidateOfferLetterAction();
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    const blob = Uint8Array.from(atob(result.base64), (char) => char.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([blob], { type: result.contentType }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = result.fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function wizardSelectValue(
    key: string,
    options: readonly { value: string }[],
  ): string {
    if (form[key]) return normalizeSelectValue(form[key], options);
    return normalizeSelectValue(sectionData[key], options);
  }

  function showValidationError(result: { missing: string[] }) {
    if (result.missing.length === 0) {
      toast.error("Please complete all required fields in this section");
      return;
    }
    if (result.missing.length <= 3) {
      toast.error(result.missing.join(" · "));
      return;
    }
    toast.error(
      `Please fix ${result.missing.length} items: ${result.missing.slice(0, 3).join(" · ")} (+${result.missing.length - 3} more)`,
    );
  }

  function saveSection(markComplete = true) {
    if (!validateBeforeSave(markComplete)) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
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
        // Refreshed context must be in place before the draft is dropped, otherwise
        // the inputs briefly fall back to pre-save values.
        await onRefresh();
        setForm({});
        setAutoSaveState("saved");
      }
    });
  }

  function uploadMeta(documentCategory: string, documentTypeCode: string) {
    const key = uploadSlotKey(documentCategory, documentTypeCode);
    const slot = uploadSlots[key];
    const saved = documentRecord(contextWithOptimisticDocs, documentCategory, documentTypeCode);
    return {
      fileName: saved?.fileName ?? slot?.pendingFileName ?? null,
      uploading: Boolean(slot?.uploading),
      pendingFileName: slot?.pendingFileName ?? null,
      uploadError: slot?.error ?? null,
      reviewStatus: saved?.reviewStatus ?? null,
      hrComment: saved?.hrComment ?? null,
    };
  }

  function uploadDoc(documentCategory: string, documentTypeCode: string, file: File) {
    const key = uploadSlotKey(documentCategory, documentTypeCode);
    setUploadSlots((prev) => ({
      ...prev,
      [key]: { uploading: true, pendingFileName: file.name, error: undefined },
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
          setUploadSlots((prev) => ({
            ...prev,
            [key]: { uploading: false, pendingFileName: file.name, error: result.message },
          }));
          return;
        }
        toast.success(`${file.name} uploaded`);
        setUploadSlots((prev) => ({
          ...prev,
          [key]: { uploading: false, pendingFileName: file.name, error: undefined },
        }));
        void onRefresh();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Upload failed";
        toast.error(message);
        setUploadSlots((prev) => ({
          ...prev,
          [key]: { uploading: false, pendingFileName: file.name, error: message },
        }));
      }
    })();
  }

  function goToStep(index: number) {
    if (index < 0 || index >= ONBOARDING_WIZARD_SECTIONS.length) return;
    if (!canNavigateToStep(index, context)) {
      toast.error("Complete earlier sections before opening this step");
      return;
    }
    void navigateToStep(index);
  }

  /**
   * Any debounced draft is written before leaving the section, so switching steps
   * can never drop what the candidate just typed.
   */
  async function navigateToStep(index: number) {
    const hadDraft = sectionHasDraftChanges();
    await flushAutoSave();
    if (hadDraft) await onRefresh();
    setForm({});
    setAutoSaveState("idle");
    setStepAnimKey((k) => k + 1);
    setStep(index);
  }

  async function markSectionCompleteIfNeeded() {
    if (sectionKey === "signature") {
      const merged = sectionPayload();
      const result = await saveCandidateSectionAction({
        caseId: context.caseId,
        sectionKey,
        data: merged,
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
    const sectionComplete = isOnboardingSectionComplete(sectionKey, contextWithOptimisticDocs);
    const hasChanges = sectionHasDraftChanges();

    if (!validation.valid) {
      if (sectionComplete && !hasChanges && sectionKey !== "terms" && sectionKey !== "signature") {
        setForm({});
        advanceStep();
        return;
      }
      showValidationError(validation);
      return;
    }

    if (sectionComplete && !hasChanges && sectionKey !== "terms" && sectionKey !== "signature") {
      setForm({});
      advanceStep();
      return;
    }

    if (sectionKey === "terms" && !termsAcceptedLive()) {
      showValidationError(validation);
      return;
    }

    const isFormSection = sectionKey !== "signature";

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }

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

        await onRefresh();
        setForm({});
        setAutoSaveState("idle");
        advanceStep();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not save section");
      }
    });
  }

  function submitAll() {
    const validation = submitValidation;
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
            data: sectionPayload(),
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
      <div className="mx-auto flex min-h-0 w-full min-w-0 max-w-6xl flex-1 flex-col items-center justify-center px-4 py-8">
        <div
          className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm"
          aria-hidden
        />
        <div className="relative z-50 w-full">
          <OnboardingSubmittedCelebration
            fullName={context.fullName}
            status={context.status}
            joiningDate={context.joiningDate}
          />
        </div>
      </div>
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

        {hasCorrectionsRequested ? (
          <div className="shrink-0 border-b border-amber-300 bg-amber-50/90 px-4 py-3 sm:px-6 dark:border-amber-500/40 dark:bg-amber-950/40">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="mt-0.5 size-4.5 shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">
                    Action required: HR requested corrections
                  </p>
                  {context.correctionNotes ? (
                    <p className="text-xs leading-relaxed text-amber-900/90 dark:text-amber-200">
                      {context.correctionNotes}
                    </p>
                  ) : (
                    <p className="text-xs leading-relaxed text-amber-900/90 dark:text-amber-200">
                      Please update the requested documents below and submit again for review.
                    </p>
                  )}
                </div>
              </div>

              {correctionSteps.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1.5 pt-1 sm:pt-0">
                  <span className="text-xs font-medium text-amber-900 dark:text-amber-200">
                    Jump to:
                  </span>
                  {correctionSteps.map((sIdx) => (
                    <button
                      key={sIdx}
                      type="button"
                      onClick={() => goToStep(sIdx)}
                      className={cn(
                        "rounded-md border border-amber-300 bg-white px-2.5 py-1 text-xs font-medium text-amber-950 shadow-2xs transition-colors hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-900/50 dark:text-amber-200",
                        step === sIdx && "ring-1 ring-amber-600 font-semibold bg-amber-100/80",
                      )}
                    >
                      {SECTION_TITLES[ONBOARDING_WIZARD_SECTIONS[sIdx]]}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

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
                    : "font-medium text-amber-800 dark:text-amber-400",
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
          <div key={sectionKey} className="min-w-0">
          {sectionKey === "personal" && (
            <OnboardingPersonalSection
              sectionData={sectionData}
              form={form}
              fullNameFallback={context.fullName ?? ""}
              personalEmailFallback={context.personalEmail ?? ""}
              inputClassName={wizardInputClassName}
              onFieldChange={updateField}
            />
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
                      reviewStatus={meta.reviewStatus}
                      hrComment={meta.hrComment}
                      uploadError={meta.uploadError}
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
                      reviewStatus={meta.reviewStatus}
                      hrComment={meta.hrComment}
                      uploadError={meta.uploadError}
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
              {(() => {
                const bankIfsc = liveSectionPatch.ifsc ?? "";
                const bankAccountNumber = liveSectionPatch.accountNumber ?? "";
                const ifscError = getIfscValidationMessage(bankIfsc);
                const accountNumberError = getBankAccountValidationMessage(bankAccountNumber);

                return (
                  <>
              <div className="grid min-w-0 gap-4 lg:grid-cols-3">
                <div className="space-y-1.5">
                  <FieldLabel label="Account holder name" required />
                  <Input
                    className={wizardInputClassName}
                    value={
                      form.accountHolderName ??
                      (readSectionField(sectionData.accountHolderName) ||
                        (context.fullName ?? ""))
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
                    className={cn(
                      wizardInputClassName,
                      accountNumberError && "border-destructive focus-visible:ring-destructive/30",
                    )}
                    inputMode="numeric"
                    maxLength={18}
                    value={form.accountNumber ?? readSectionField(sectionData.accountNumber)}
                    onChange={(e) =>
                      updateField("accountNumber", sanitizeAccountNumber(e.target.value))
                    }
                    placeholder="Account number"
                  />
                  <FieldHint error={accountNumberError} />
                </div>
              </div>

              <div className="grid min-w-0 gap-4 lg:grid-cols-3">
                <div className="space-y-1.5">
                  <FieldLabel label="IFSC code" required />
                  <Input
                    className={cn(
                      wizardInputClassName,
                      "uppercase",
                      ifscError && "border-destructive focus-visible:ring-destructive/30",
                    )}
                    maxLength={11}
                    value={form.ifsc ?? readSectionField(sectionData.ifsc)}
                    onChange={(e) => updateField("ifsc", sanitizeIfsc(e.target.value))}
                    placeholder="SBIN0001234"
                  />
                  <FieldHint error={ifscError} />
                  {!ifscError ? (
                    <p className="text-[11px] text-muted-foreground">
                      11 characters — 4 bank letters, then 0, then 6 branch characters
                    </p>
                  ) : null}
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
                    value={wizardSelectValue(
                      "accountType",
                      ONBOARDING_BANK_ACCOUNT_TYPE_OPTIONS,
                    )}
                    placeholder="Savings / Current"
                    onValueChange={(value) => updateField("accountType", value)}
                    triggerClassName={wizardInputClassName}
                  />
                </div>
              </div>
                  </>
                );
              })()}

              <div className="mx-auto w-full max-w-sm">
                <OnboardingDocumentUpload
                  variant="card"
                  label="Cancelled Cheque — optional"
                  fileName={uploadMeta("bank", "cancelled_cheque").fileName}
                  uploading={uploadMeta("bank", "cancelled_cheque").uploading}
                  pendingFileName={uploadMeta("bank", "cancelled_cheque").pendingFileName}
                  reviewStatus={uploadMeta("bank", "cancelled_cheque").reviewStatus}
                  hrComment={uploadMeta("bank", "cancelled_cheque").hrComment}
                  uploadError={uploadMeta("bank", "cancelled_cheque").uploadError}
                  onSelectFile={(file) => uploadDoc("bank", "cancelled_cheque", file)}
                />
              </div>
            </div>
          )}

          {sectionKey === "terms" && (
            <OnboardingTermsSection
              accepted={termsAcceptedLive()}
              onAcceptedChange={(checked) =>
                updateField("termsAccepted", checked ? "true" : "")
              }
            />
          )}

          {sectionKey === "signature" && (
            <OnboardingOfferAcceptanceSection
              context={context}
              completedSteps={completedSteps}
              activeStep={step}
              offerAccepted={offerAcceptedLive()}
              onOfferAcceptedChange={(checked) =>
                updateField("offerAccepted", checked ? "true" : "")
              }
              signedOfferMeta={uploadMeta(
                ONBOARDING_OFFER_ACCEPTANCE_CATEGORY,
                ONBOARDING_SIGNED_OFFER_DOCUMENT_CODE,
              )}
              onUploadSignedOffer={(file) =>
                uploadDoc(
                  ONBOARDING_OFFER_ACCEPTANCE_CATEGORY,
                  ONBOARDING_SIGNED_OFFER_DOCUMENT_CODE,
                  file,
                )
              }
              onViewOfferLetter={viewOfferLetter}
              onDownloadOfferLetter={downloadOfferLetter}
            />
          )}

          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 border-t border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Button
            variant="outline"
            disabled={step === 0 || isPending}
            onClick={() => void navigateToStep(step - 1)}
            className="w-full sm:w-auto"
          >
            Previous
          </Button>

          <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
            {autoSaveState !== "idle" ? (
              <span
                aria-live="polite"
                className="mr-1 shrink-0 text-xs text-muted-foreground"
              >
                {autoSaveState === "saving" ? "Saving…" : "Saved"}
              </span>
            ) : null}

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
                disabled={isPending}
                className={cn(
                  "w-full sm:w-auto font-semibold transition-all",
                  submitValidation.valid
                    ? "bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-sm hover:opacity-95"
                    : "opacity-80",
                )}
              >
                Submit for HR review
              </Button>
            ) : (
              <Button
                onClick={goNext}
                disabled={isPending || !canAdvance}
                className={cn(
                  "w-full sm:w-auto font-semibold transition-all",
                  canAdvance
                    ? "bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-sm hover:opacity-95"
                    : "opacity-80",
                )}
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
