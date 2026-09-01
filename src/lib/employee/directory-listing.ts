const DIRECTORY_HIDDEN_EMPLOYEE_CODES = new Set(["IF2026000", "IF-MGR-001"]);

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

type DirectoryPersonName = {
  employeeCode?: string | null;
  firstName?: string | null;
  lastName?: string | null;
};

function directoryFullName(person?: DirectoryPersonName): string {
  return `${person?.firstName ?? ""} ${person?.lastName ?? ""}`.trim().toLowerCase();
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

export function isHiddenFromEmployeeDirectory(employeeCode: string | null | undefined): boolean {
  return DIRECTORY_HIDDEN_EMPLOYEE_CODES.has(normalizeEmployeeCode(employeeCode));
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
