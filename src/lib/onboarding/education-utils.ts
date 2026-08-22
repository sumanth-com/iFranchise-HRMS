import { normalizeIntermediateQualification } from "@/lib/onboarding/education-options";
import { ONBOARDING_UPLOAD_MAX_MB } from "@/lib/onboarding/constants";
import {
  ONBOARDING_EDUCATION_LEVELS,
  type OnboardingEducationEntry,
  type OnboardingEducationLevelCode,
} from "@/types/onboarding";

export const EDUCATION_DOCUMENT_CODES = {
  ssc_marksheet: "edu_ssc_marksheet",
  ssc_certificate: "edu_ssc_certificate",
  intermediate_marksheet: "edu_intermediate_marksheet",
  intermediate_certificate: "edu_intermediate_certificate",
  graduation_semester_marksheets: "edu_graduation_semester_marksheets",
  graduation_degree_certificate: "edu_graduation_degree_certificate",
  graduation_tc: "edu_graduation_tc",
  graduation_migration: "edu_graduation_migration",
} as const;

export type EducationDocumentCode =
  (typeof EDUCATION_DOCUMENT_CODES)[keyof typeof EDUCATION_DOCUMENT_CODES];

export const EDUCATION_DOCUMENT_LABELS: Record<EducationDocumentCode, string> = {
  [EDUCATION_DOCUMENT_CODES.ssc_marksheet]: "10th Marks Memo / Marksheet",
  [EDUCATION_DOCUMENT_CODES.ssc_certificate]: "10th Certificate / SSC Certificate",
  [EDUCATION_DOCUMENT_CODES.intermediate_marksheet]: "12th Marksheet",
  [EDUCATION_DOCUMENT_CODES.intermediate_certificate]:
    "12th Passing Certificate / Intermediate Certificate",
  [EDUCATION_DOCUMENT_CODES.graduation_semester_marksheets]: "Semester-wise Mark Sheets",
  [EDUCATION_DOCUMENT_CODES.graduation_degree_certificate]: "Degree Certificate",
  [EDUCATION_DOCUMENT_CODES.graduation_tc]: "Transfer Certificate (TC)",
  [EDUCATION_DOCUMENT_CODES.graduation_migration]: "Migration Certificate",
};

export type OnboardingSscDetails = {
  schoolName: string;
  board: string;
  periodFrom: string;
  periodTo: string;
  percentageOrCgpa: string;
  rollNumber: string;
  placeOrState: string;
};

export type OnboardingIntermediateDetails = {
  qualification: string;
  schoolName: string;
  board: string;
  stream: string;
  periodFrom: string;
  periodTo: string;
  percentageOrCgpa: string;
  rollNumber: string;
  collegeStateOrLocation: string;
};

export type OnboardingGraduationDetails = {
  degree: string;
  specialization: string;
  collegeName: string;
  university: string;
  periodFrom: string;
  periodTo: string;
  percentageOrCgpa: string;
  rollNumber: string;
  stateOrLocation: string;
};

export type OnboardingEducationFormData = {
  ssc: OnboardingSscDetails;
  intermediate: OnboardingIntermediateDetails;
  graduation: OnboardingGraduationDetails;
};

const LEVEL_CODES = new Set<string>(ONBOARDING_EDUCATION_LEVELS.map((l) => l.code));

function isLevelCode(value: string): value is OnboardingEducationLevelCode {
  return LEVEL_CODES.has(value);
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function createEmptyEducationForm(): OnboardingEducationFormData {
  return {
    ssc: {
      schoolName: "",
      board: "",
      periodFrom: "",
      periodTo: "",
      percentageOrCgpa: "",
      rollNumber: "",
      placeOrState: "",
    },
    intermediate: {
      qualification: "",
      schoolName: "",
      board: "",
      stream: "",
      periodFrom: "",
      periodTo: "",
      percentageOrCgpa: "",
      rollNumber: "",
      collegeStateOrLocation: "",
    },
    graduation: {
      degree: "",
      specialization: "",
      collegeName: "",
      university: "",
      periodFrom: "",
      periodTo: "",
      percentageOrCgpa: "",
      rollNumber: "",
      stateOrLocation: "",
    },
  };
}

function readPeriodFields(
  record: Record<string, unknown>,
  legacyFromKey?: string,
  legacyToKey?: string,
  legacySingleYearKey?: string,
): { periodFrom: string; periodTo: string } {
  const periodFrom = readString(record.periodFrom);
  const periodTo = readString(record.periodTo);
  if (periodFrom && periodTo) return { periodFrom, periodTo };

  const legacyFrom = legacyFromKey ? readString(record[legacyFromKey]) : "";
  const legacyTo = legacyToKey ? readString(record[legacyToKey]) : "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(legacyFrom) && /^\d{4}-\d{2}-\d{2}$/.test(legacyTo)) {
    return { periodFrom: legacyFrom, periodTo: legacyTo };
  }
  if (/^\d{4}$/.test(legacyFrom) && /^\d{4}$/.test(legacyTo)) {
    return {
      periodFrom: `${legacyFrom}-06-01`,
      periodTo: `${legacyTo}-04-30`,
    };
  }

  const legacyYear = legacySingleYearKey ? readString(record[legacySingleYearKey]) : "";
  if (/^\d{4}$/.test(legacyYear)) {
    return {
      periodFrom: `${legacyYear}-06-01`,
      periodTo: `${legacyYear}-04-30`,
    };
  }

  return { periodFrom: "", periodTo: "" };
}

function parseSscDetails(raw: unknown, legacyData: Record<string, unknown>): OnboardingSscDetails {
  const empty = createEmptyEducationForm().ssc;
  if (!raw || typeof raw !== "object") {
    const legacySchool = readString(legacyData.ssc);
    return legacySchool ? { ...empty, schoolName: legacySchool } : empty;
  }
  const record = raw as Record<string, unknown>;
  const period = readPeriodFields(record, undefined, undefined, "yearOfPassing");
  return {
    schoolName: readString(record.schoolName),
    board: readString(record.board),
    ...period,
    percentageOrCgpa: readString(record.percentageOrCgpa),
    rollNumber: readString(record.rollNumber),
    placeOrState: readString(record.placeOrState),
  };
}

function parseIntermediateDetails(
  raw: unknown,
  legacyData: Record<string, unknown>,
): OnboardingIntermediateDetails {
  const empty = createEmptyEducationForm().intermediate;
  if (!raw || typeof raw !== "object") {
    const legacySchool = readString(legacyData.intermediate);
    return legacySchool ? { ...empty, schoolName: legacySchool } : empty;
  }
  const record = raw as Record<string, unknown>;
  const period = readPeriodFields(record, undefined, undefined, "yearOfPassing");
  return {
    qualification: normalizeIntermediateQualification(readString(record.qualification)),
    schoolName: readString(record.schoolName),
    board: readString(record.board),
    stream: readString(record.stream),
    ...period,
    percentageOrCgpa: readString(record.percentageOrCgpa),
    rollNumber: readString(record.rollNumber),
    collegeStateOrLocation: readString(record.collegeStateOrLocation),
  };
}

function parseGraduationDetails(
  raw: unknown,
  legacyData: Record<string, unknown>,
): OnboardingGraduationDetails {
  const empty = createEmptyEducationForm().graduation;
  if (!raw || typeof raw !== "object") {
    const legacySchool = readString(legacyData.graduation);
    return legacySchool ? { ...empty, collegeName: legacySchool } : empty;
  }
  const record = raw as Record<string, unknown>;
  const period = readPeriodFields(record, "yearOfAdmission", "yearOfPassing");
  return {
    degree: readString(record.degree),
    specialization: readString(record.specialization),
    collegeName: readString(record.collegeName),
    university: readString(record.university),
    ...period,
    percentageOrCgpa: readString(record.percentageOrCgpa),
    rollNumber: readString(record.rollNumber),
    stateOrLocation: readString(record.stateOrLocation),
  };
}

/** @deprecated Legacy dynamic entries — kept for HR document titles on old uploads. */
export function educationDocumentTypeCode(entryId: string): string {
  return `edu_${entryId}`;
}

export function parseEducationEntries(data: Record<string, unknown>): OnboardingEducationEntry[] {
  const raw = data.entries;
  if (Array.isArray(raw)) {
    const parsed: OnboardingEducationEntry[] = [];
    for (const item of raw) {
      if (!item || typeof item !== "object") continue;
      const record = item as Record<string, unknown>;
      const id = typeof record.id === "string" ? record.id : "";
      const level = typeof record.level === "string" ? record.level : "";
      const institutionName =
        typeof record.institutionName === "string" ? record.institutionName : "";
      if (!id || !isLevelCode(level)) continue;
      parsed.push({ id, level, institutionName });
    }
    if (parsed.length > 0) return parsed;
  }

  const legacy: OnboardingEducationEntry[] = [];
  for (const level of ONBOARDING_EDUCATION_LEVELS) {
    const value = data[level.code];
    if (typeof value === "string" && value.trim()) {
      legacy.push({
        id: level.code,
        level: level.code,
        institutionName: value.trim(),
      });
    }
  }
  return legacy;
}

export function parseEducationForm(data: Record<string, unknown>): OnboardingEducationFormData {
  return {
    ssc: parseSscDetails(data.ssc, data),
    intermediate: parseIntermediateDetails(data.intermediate, data),
    graduation: parseGraduationDetails(data.graduation, data),
  };
}

export function educationFormToPayload(form: OnboardingEducationFormData): Record<string, unknown> {
  return {
    ssc: { ...form.ssc },
    intermediate: { ...form.intermediate },
    graduation: { ...form.graduation },
  };
}

export function educationLevelLabel(code: string): string {
  return ONBOARDING_EDUCATION_LEVELS.find((l) => l.code === code)?.label ?? code.replace(/_/g, " ");
}

export function educationDocumentLabel(typeCode: string): string {
  if (typeCode in EDUCATION_DOCUMENT_LABELS) {
    return EDUCATION_DOCUMENT_LABELS[typeCode as EducationDocumentCode];
  }
  if (typeCode.startsWith("edu_")) {
    return typeCode.replace(/^edu_/, "").replace(/_/g, " ");
  }
  return typeCode.replace(/_/g, " ");
}

export function educationDocumentMaxMb(_typeCode: string): number {
  return ONBOARDING_UPLOAD_MAX_MB;
}

export function createEducationEntry(level: OnboardingEducationLevelCode): OnboardingEducationEntry {
  return {
    id: crypto.randomUUID(),
    level,
    institutionName: "",
  };
}
