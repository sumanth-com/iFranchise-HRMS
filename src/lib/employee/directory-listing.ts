const DIRECTORY_HIDDEN_EMPLOYEE_CODES = new Set([
  "IF2026000",
  "IF-MGR-001",
  "IF2026016",
]);

export const DIRECTORY_INCLUDED_EMPLOYEE_CODES = ["IF2026009", "IF-PENDING-SA"] as const;
export const DIRECTORY_INCLUDED_EMPLOYEE_EMAILS = ["sumanth.reddy@ifranchise.in"] as const;

const DESIGNATION_DISPLAY_BY_CODE: Record<string, string> = {
  ASSISTANT_BDM: "Assistant Business Development Manager",
  WEBSITE_DEVELOPER_INTERN: "Website Development Intern",
};

const DESIGNATION_DISPLAY_BY_TITLE: Record<string, string> = {
  "assistant bdm": "Assistant Business Development Manager",
  "website developer intern": "Website Development Intern",
};

const DESIGNATION_DISPLAY_BY_EMPLOYEE_CODE: Record<string, string> = {
  IF2026009: "Website Development Intern",
  "IF-PENDING-SA": "Website Development Intern",
};

const DIRECTORY_TECHNOLOGY_DEPARTMENT = "Technology";

type DirectoryPersonName = {
  employeeCode?: string | null;
  firstName?: string | null;
  lastName?: string | null;
};

function directoryFullName(person?: DirectoryPersonName): string {
  return `${person?.firstName ?? ""} ${person?.lastName ?? ""}`.trim().toLowerCase();
}

function isDirectorySumanth(person?: DirectoryPersonName): boolean {
  const code = normalizeEmployeeCode(person?.employeeCode);
  if (code === "IF2026009" || code.startsWith("IF-PENDING-SA")) return true;

  const fullName = directoryFullName(person);
  return fullName.includes("sumanth") && fullName.includes("reddy");
}

function designationForDirectoryPerson(person?: DirectoryPersonName): string | null {
  const codeMapped = DESIGNATION_DISPLAY_BY_EMPLOYEE_CODE[normalizeEmployeeCode(person?.employeeCode)];
  if (codeMapped) return codeMapped;

  const fullName = directoryFullName(person);
  if (fullName.includes("gangaram") && fullName.includes("reddy")) {
    return "Website Development Intern";
  }
  if (fullName.includes("samit") && fullName.includes("ali")) {
    return "UI/UX intern";
  }
  if (fullName.includes("hemavathi") || (person?.lastName ?? "").toLowerCase().includes("hemavathi")) {
    return "Software Quality Assurance Intern";
  }

  return null;
}

export function normalizeEmployeeCode(code: string | null | undefined): string {
  return (code ?? "").trim().toUpperCase();
}

export function isHiddenFromEmployeeDirectory(
  employeeCode: string | null | undefined,
  person?: DirectoryPersonName,
): boolean {
  if (DIRECTORY_HIDDEN_EMPLOYEE_CODES.has(normalizeEmployeeCode(employeeCode))) {
    return true;
  }

  const fullName = directoryFullName(person);
  if (!fullName) return false;

  const isGore = fullName.includes("gore");
  const isAbhisek =
    fullName.includes("abhisek") ||
    fullName.includes("abhishake") ||
    fullName.includes("abhishek");

  return isGore && isAbhisek;
}

export function directoryDesignationDisplay(
  title: string | null | undefined,
  code?: string | null,
  person?: DirectoryPersonName,
): string | null {
  const personMapped = designationForDirectoryPerson(person);
  if (personMapped) return personMapped;

  const trimmedCode = (code ?? "").trim().toUpperCase();
  if (trimmedCode && DESIGNATION_DISPLAY_BY_CODE[trimmedCode]) {
    return DESIGNATION_DISPLAY_BY_CODE[trimmedCode];
  }

  const trimmedTitle = (title ?? "").trim();
  if (!trimmedTitle) return title ?? null;

  const mapped = DESIGNATION_DISPLAY_BY_TITLE[trimmedTitle.toLowerCase()];
  return mapped ?? trimmedTitle;
}

/** Directory-only: show Sumanth under Technology. */
export function directoryDepartmentOverride(
  person?: DirectoryPersonName,
): { name: string } | null {
  if (!isDirectorySumanth(person)) return null;
  return { name: DIRECTORY_TECHNOLOGY_DEPARTMENT };
}

/** Directory-only labels (does not rename departments in HR data). */
export function directoryDepartmentLabel(name: string | null | undefined): string | null {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return name ?? null;
  if (trimmed.toLowerCase() === "administration") return "C Suite";
  return trimmed;
}
