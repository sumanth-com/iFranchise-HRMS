"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import { OnboardingSignature } from "@/components/onboarding/candidate/onboarding-signature";
import {
  saveCandidateAgreementsAction,
  saveCandidatePoliciesAction,
  saveCandidateSectionAction,
  saveCandidateSignatureAction,
  submitCandidateOnboardingAction,
  uploadCandidateDocumentAction,
} from "@/lib/onboarding/actions/candidate-onboarding-actions";
import {
  ONBOARDING_AGREEMENT_TYPES,
  ONBOARDING_EMPLOYMENT_DOCUMENTS,
  ONBOARDING_IDENTITY_DOCUMENTS,
  ONBOARDING_POLICY_DOCUMENTS,
  ONBOARDING_STATUS_LABELS,
  ONBOARDING_WIZARD_SECTIONS,
} from "@/types/onboarding";
import type { CandidatePortalContext } from "@/types/onboarding";

const SECTION_LABELS: Record<string, string> = {
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

type OnboardingWizardProps = {
  context: CandidatePortalContext;
  onRefresh: () => void;
};

export function OnboardingWizard({ context, onRefresh }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [isPending, startTransition] = useTransition();
  const sectionKey = ONBOARDING_WIZARD_SECTIONS[step];
  const sectionData = context.sections.find((s) => s.sectionKey === sectionKey)?.data ?? {};

  const [form, setForm] = useState<Record<string, string>>({});

  function updateField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function saveSection(markComplete = true) {
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
        toast.success("Section saved");
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

  function submitAll() {
    startTransition(async () => {
      const result = await submitCandidateOnboardingAction();
      if (!result.success) toast.error(result.message);
      else toast.success(result.message);
      onRefresh();
    });
  }

  if (context.locked) {
    return (
      <div className="rounded-xl border p-8 text-center max-w-lg mx-auto">
        <h2 className="text-xl font-semibold">Onboarding submitted</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          Your onboarding is under HR review ({ONBOARDING_STATUS_LABELS[context.status]}).
          You will receive your company account details after approval.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-wrap gap-2">
        {ONBOARDING_WIZARD_SECTIONS.map((key, index) => (
          <button
            key={key}
            type="button"
            onClick={() => setStep(index)}
            className={`rounded-full px-3 py-1 text-xs border ${index === step ? "bg-primary text-primary-foreground" : "bg-background"}`}
          >
            {SECTION_LABELS[key]}
          </button>
        ))}
      </div>

      <div className="rounded-xl border p-6 bg-card">
        <h2 className="text-lg font-semibold mb-4">{SECTION_LABELS[sectionKey]}</h2>

        {sectionKey === "personal" && (
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["fullName", "Full name"],
              ["dateOfBirth", "Date of birth"],
              ["gender", "Gender"],
              ["maritalStatus", "Marital status"],
              ["bloodGroup", "Blood group"],
              ["nationality", "Nationality"],
              ["address", "Address"],
              ["emergencyContact", "Emergency contact"],
              ["personalMobile", "Personal mobile"],
              ["personalEmail", "Personal email"],
            ].map(([key, label]) => (
              <div key={key}>
                <Label>{label}</Label>
                <Input
                  value={form[key] ?? String(sectionData[key] ?? "")}
                  onChange={(e) => updateField(key, e.target.value)}
                />
              </div>
            ))}
          </div>
        )}

        {sectionKey === "identity" && (
          <div className="space-y-4">
            {ONBOARDING_IDENTITY_DOCUMENTS.map((doc) => (
              <div key={doc.code} className="border rounded-lg p-3">
                <Label>{doc.label}{doc.required ? " *" : ""}</Label>
                <Input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadDoc("identity", doc.code, file);
                  }}
                />
              </div>
            ))}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Aadhaar number</Label>
                <Input value={form.aadhaar ?? String(sectionData.aadhaar ?? "")} onChange={(e) => updateField("aadhaar", e.target.value)} />
              </div>
              <div>
                <Label>PAN</Label>
                <Input value={form.pan ?? String(sectionData.pan ?? "")} onChange={(e) => updateField("pan", e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {sectionKey === "education" && (
          <div className="grid gap-3">
            {["ssc", "intermediate", "graduation", "postGraduation", "certifications"].map((key) => (
              <div key={key}>
                <Label className="capitalize">{key.replace(/([A-Z])/g, " $1")}</Label>
                <Input value={form[key] ?? String(sectionData[key] ?? "")} onChange={(e) => updateField(key, e.target.value)} />
              </div>
            ))}
          </div>
        )}

        {sectionKey === "employment_history" && (
          <div className="space-y-4">
            {ONBOARDING_EMPLOYMENT_DOCUMENTS.map((doc) => (
              <div key={doc.code} className="border rounded-lg p-3">
                <Label>{doc.label}{doc.required ? " *" : ""}</Label>
                <Input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadDoc("employment", doc.code, file);
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {sectionKey === "bank" && (
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["bankName", "Bank name"],
              ["accountNumber", "Account number"],
              ["ifsc", "IFSC"],
            ].map(([key, label]) => (
              <div key={key}>
                <Label>{label}</Label>
                <Input value={form[key] ?? String(sectionData[key] ?? "")} onChange={(e) => updateField(key, e.target.value)} />
              </div>
            ))}
            <div className="sm:col-span-2">
              <Label>Cancelled cheque</Label>
              <Input type="file" accept=".pdf,image/*" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadDoc("bank", "cancelled_cheque", file);
              }} />
            </div>
          </div>
        )}

        {sectionKey === "tax" && (
          <div className="grid gap-3">
            <div>
              <Label>PAN</Label>
              <Input value={form.taxPan ?? String(sectionData.taxPan ?? "")} onChange={(e) => updateField("taxPan", e.target.value)} />
            </div>
            <div>
              <Label>Aadhaar</Label>
              <Input value={form.taxAadhaar ?? String(sectionData.taxAadhaar ?? "")} onChange={(e) => updateField("taxAadhaar", e.target.value)} />
            </div>
            <div>
              <Label>Tax declaration</Label>
              <Input value={form.taxDeclaration ?? String(sectionData.taxDeclaration ?? "")} onChange={(e) => updateField("taxDeclaration", e.target.value)} />
            </div>
          </div>
        )}

        {sectionKey === "policies" && (
          <div className="space-y-3">
            {ONBOARDING_POLICY_DOCUMENTS.map((policy) => {
              const checked = context.policyAcknowledgements.includes(policy.code);
              return (
                <label key={policy.code} className="flex items-center gap-2 text-sm border rounded-lg p-3">
                  <input
                    type="checkbox"
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
                  I have read and acknowledge the {policy.label}
                </label>
              );
            })}
          </div>
        )}

        {sectionKey === "agreements" && (
          <div className="space-y-3">
            {ONBOARDING_AGREEMENT_TYPES.map((agreement) => {
              const accepted = context.agreements.some((a) => a.agreementType === agreement.code);
              return (
                <label key={agreement.code} className="flex items-center gap-2 text-sm border rounded-lg p-3">
                  <input
                    type="checkbox"
                    checked={accepted}
                    onChange={(e) => {
                      const types = e.target.checked
                        ? [...context.agreements.map((a) => a.agreementType), agreement.code]
                        : context.agreements.map((a) => a.agreementType).filter((c) => c !== agreement.code);
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
                  I accept the {agreement.label}
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

        {sectionKey !== "policies" && sectionKey !== "agreements" && sectionKey !== "signature" && (
          <div className="mt-4">
            <Button onClick={() => saveSection()} disabled={isPending}>Save section</Button>
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <Button variant="outline" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
          Previous
        </Button>
        {step < ONBOARDING_WIZARD_SECTIONS.length - 1 ? (
          <Button onClick={() => setStep((s) => s + 1)}>Next</Button>
        ) : (
          <Button onClick={submitAll} disabled={isPending}>Submit for HR review</Button>
        )}
      </div>

      <p className="text-center text-sm text-muted-foreground">Progress: {context.completionPercent}%</p>
    </div>
  );
}