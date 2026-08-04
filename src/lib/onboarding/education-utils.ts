import {
  ONBOARDING_EDUCATION_LEVELS,
  type OnboardingEducationEntry,
  type OnboardingEducationLevelCode,
} from "@/types/onboarding";

const LEVEL_CODES = new Set<string>(ONBOARDING_EDUCATION_LEVELS.map((l) => l.code));

function isLevelCode(value: string): value is OnboardingEducationLevelCode {
  return LEVEL_CODES.has(value);
}

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

export function educationLevelLabel(code: string): string {
  return ONBOARDING_EDUCATION_LEVELS.find((l) => l.code === code)?.label ?? code.replace(/_/g, " ");
}

export function createEducationEntry(level: OnboardingEducationLevelCode): OnboardingEducationEntry {
  return {
    id: crypto.randomUUID(),
    level,
    institutionName: "",
  };
}
