import { isValidEducationDateRange } from "@/lib/onboarding/education-options";

export const EMPLOYMENT_TYPE_OPTIONS = [
  "Full-time",
  "Part-time",
  "Contract",
  "Internship",
] as const;

export const EMPLOYMENT_ENTRY_DOCUMENTS = [
  {
    code: "experience_relieving",
    label: "Experience / Relieving Letter",
    required: true,
  },
  {
    code: "offer_appointment",
    label: "Offer / Appointment Letter",
    required: true,
  },
  {
    code: "payslips_3months",
    label: "Last 3 Months' Payslips",
    hint: "if your company requires them",
    required: true,
  },
  {
    code: "fnf_settlement",
    label: "Full & Final Settlement Letter",
    hint: "if applicable",
    required: true,
  },
  {
    code: "employment_verification",
    label: "Employment Verification Letter",
    hint: "if applicable",
    required: true,
  },
] as const;

export type EmploymentEntryDocumentCode =
  (typeof EMPLOYMENT_ENTRY_DOCUMENTS)[number]["code"];

export type OnboardingEmploymentEntry = {
  id: string;
  companyName: string;
  companyLocation: string;
  jobTitle: string;
  department: string;
  employmentType: string;
  dateOfJoining: string;
  dateOfLeaving: string;
  totalExperience: string;
  lastDrawnCtc: string;
  reasonForLeaving: string;
};

export type OnboardingEmploymentFormData = {
  noPriorExperience: boolean;
  entries: OnboardingEmploymentEntry[];
};

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readBool(value: unknown): boolean {
  return value === true;
}

export function employmentDocumentTypeCode(
  entryId: string,
  docCode: string,
): string {
  return `emp_${entryId}_${docCode}`;
}

export function employmentDocumentLabel(typeCode: string): string {
  if (!typeCode.startsWith("emp_")) return typeCode.replace(/_/g, " ");
  const parts = typeCode.split("_");
  const docCode = parts.slice(2).join("_");
  const match = EMPLOYMENT_ENTRY_DOCUMENTS.find((doc) => doc.code === docCode);
  return match?.label ?? docCode.replace(/_/g, " ");
}

export function createEmptyEmploymentEntry(): OnboardingEmploymentEntry {
  return {
    id: crypto.randomUUID(),
    companyName: "",
    companyLocation: "",
    jobTitle: "",
    department: "",
    employmentType: "",
    dateOfJoining: "",
    dateOfLeaving: "",
    totalExperience: "",
    lastDrawnCtc: "",
    reasonForLeaving: "",
  };
}

export function createEmptyEmploymentForm(): OnboardingEmploymentFormData {
  return {
    noPriorExperience: false,
    entries: [createEmptyEmploymentEntry()],
  };
}

function parseEmploymentEntry(raw: unknown): OnboardingEmploymentEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const id = readString(record.id);
  if (!id) return null;
  return {
    id,
    companyName: readString(record.companyName),
    companyLocation: readString(record.companyLocation),
    jobTitle: readString(record.jobTitle),
    department: readString(record.department),
    employmentType: readString(record.employmentType),
    dateOfJoining: readString(record.dateOfJoining),
    dateOfLeaving: readString(record.dateOfLeaving),
    totalExperience: readString(record.totalExperience),
    lastDrawnCtc: readString(record.lastDrawnCtc),
    reasonForLeaving: readString(record.reasonForLeaving),
  };
}

export function parseEmploymentForm(
  data: Record<string, unknown>,
): OnboardingEmploymentFormData {
  const noPriorExperience = readBool(data.noPriorExperience);
  const rawEntries = data.entries;
  if (Array.isArray(rawEntries)) {
    const entries = rawEntries
      .map(parseEmploymentEntry)
      .filter((entry): entry is OnboardingEmploymentEntry => entry !== null);
    if (entries.length > 0) {
      return { noPriorExperience, entries };
    }
  }
  if (noPriorExperience) {
    return { noPriorExperience: true, entries: [] };
  }
  return createEmptyEmploymentForm();
}

export function employmentFormToPayload(
  form: OnboardingEmploymentFormData,
): Record<string, unknown> {
  return {
    noPriorExperience: form.noPriorExperience,
    entries: form.noPriorExperience ? [] : form.entries,
  };
}

export function computeEmploymentDuration(
  dateOfJoining: string,
  dateOfLeaving: string,
): string {
  if (!dateOfJoining || !dateOfLeaving) return "";
  const start = Date.parse(dateOfJoining);
  const end = Date.parse(dateOfLeaving);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return "";

  const months =
    (new Date(end).getFullYear() - new Date(start).getFullYear()) * 12 +
    (new Date(end).getMonth() - new Date(start).getMonth()) +
    1;
  if (months < 12) return `${months} month${months === 1 ? "" : "s"}`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (rem === 0) return `${years} year${years === 1 ? "" : "s"}`;
  return `${years} year${years === 1 ? "" : "s"} ${rem} month${rem === 1 ? "" : "s"}`;
}

export function isValidEmploymentDates(
  dateOfJoining: string,
  dateOfLeaving: string,
): boolean {
  return isValidEducationDateRange(dateOfJoining, dateOfLeaving);
}
