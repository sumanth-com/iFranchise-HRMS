export type DesignationDisplayPerson = {
  employeeCode?: string | null;
  firstName?: string | null;
  lastName?: string | null;
};

const DESIGNATION_BY_CODE: Record<string, string> = {
  CEO: "Chief Executive Officer",
  ASSISTANT_BDM: "Assistant Business Development Manager",
  WEBSITE_DEVELOPER_INTERN: "Web Development Intern",
  WEB_DEVELOPMENT_INTERN: "Web Development Intern",
  UI_UX_INTERN: "UI/UX Intern",
  SQA_INTERN: "Software Quality Assurance Intern",
  SDE: "Software Development Engineer (SDE)",
  SOFTWARE_DEVELOPMENT_ENGINEER: "Software Development Engineer (SDE)",
};

const DESIGNATION_BY_TITLE: Record<string, string> = {
  ceo: "Chief Executive Officer",
  "chief executive officer": "Chief Executive Officer",
  "assistant bdm": "Assistant Business Development Manager",
  "website developer intern": "Web Development Intern",
  "web development intern": "Web Development Intern",
  "ui/ux intern": "UI/UX Intern",
  "ui ux intern": "UI/UX Intern",
  "software quality assurance intern": "Software Quality Assurance Intern",
  "sqa intern": "Software Quality Assurance Intern",
  intern: "Intern",
  sde: "Software Development Engineer (SDE)",
  "software development engineer": "Software Development Engineer (SDE)",
  "software development engineer (sde)": "Software Development Engineer (SDE)",
};

const DESIGNATION_BY_EMPLOYEE_CODE: Record<string, string> = {
  IF2026000: "Super Admin",
};

function personFullName(person?: DesignationDisplayPerson): string {
  return `${person?.firstName ?? ""} ${person?.lastName ?? ""}`.trim().toLowerCase();
}

function designationFallbackForPerson(person?: DesignationDisplayPerson): string | null {
  const code = normalizeEmployeeCode(person?.employeeCode);
  if (code && DESIGNATION_BY_EMPLOYEE_CODE[code]) {
    return DESIGNATION_BY_EMPLOYEE_CODE[code];
  }

  const fullName = personFullName(person);
  if (!fullName) return null;

  if (
    fullName === "it team" ||
    fullName === "itteam" ||
    fullName.startsWith("it team")
  ) {
    return "Super Admin";
  }

  return null;
}

function polishDesignationTitle(title: string, code?: string | null): string {
  const designationCode = (code ?? "").trim().toUpperCase();
  if (designationCode && DESIGNATION_BY_CODE[designationCode]) {
    return DESIGNATION_BY_CODE[designationCode];
  }

  const mapped = DESIGNATION_BY_TITLE[title.toLowerCase()];
  if (mapped) return mapped;

  if (title.toUpperCase() === "CEO") {
    return "Chief Executive Officer";
  }

  return title;
}

/**
 * Full designation label for cards, profile headers, directory, and payslips.
 * Live employee.designation title always wins so HR/Admin/CEO edits show everywhere.
 */
export function formatDesignationDisplay(
  title: string | null | undefined,
  options?: {
    code?: string | null;
    person?: DesignationDisplayPerson;
    fallback?: string;
  },
): string {
  const trimmed = (title ?? "").trim();
  if (trimmed) {
    return polishDesignationTitle(trimmed, options?.code);
  }

  const personMapped = designationFallbackForPerson(options?.person);
  if (personMapped) return personMapped;

  const designationCode = (options?.code ?? "").trim().toUpperCase();
  if (designationCode && DESIGNATION_BY_CODE[designationCode]) {
    return DESIGNATION_BY_CODE[designationCode];
  }

  return options?.fallback ?? "Team Member";
}

export function normalizeEmployeeCode(code: string | null | undefined): string {
  return (code ?? "").trim().toUpperCase();
}
