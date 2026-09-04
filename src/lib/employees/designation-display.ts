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
};

const DESIGNATION_BY_EMPLOYEE_CODE: Record<string, string> = {
  IF2026000: "Chief Executive Officer",
  IF2026009: "Web Development Intern",
  "IF-PENDING-SA": "Web Development Intern",
};

function personFullName(person?: DesignationDisplayPerson): string {
  return `${person?.firstName ?? ""} ${person?.lastName ?? ""}`.trim().toLowerCase();
}

function designationForPerson(person?: DesignationDisplayPerson): string | null {
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
    return "Chief Executive Officer";
  }

  if (fullName.includes("gangaram") && fullName.includes("reddy")) {
    return "Web Development Intern";
  }
  if (fullName.includes("sumanth") && fullName.includes("reddy")) {
    return "Web Development Intern";
  }
  if (fullName.includes("samit") && fullName.includes("ali")) {
    return "UI/UX Intern";
  }
  if (
    fullName.includes("hema") ||
    fullName.includes("hemavathi") ||
    (person?.lastName ?? "").toLowerCase().includes("hemavathi")
  ) {
    return "Software Quality Assurance Intern";
  }

  return null;
}

/** Full designation label for ID cards, profile headers, and directory rows. */
export function formatDesignationDisplay(
  title: string | null | undefined,
  options?: {
    code?: string | null;
    person?: DesignationDisplayPerson;
    fallback?: string;
  },
): string {
  const personMapped = designationForPerson(options?.person);
  if (personMapped) return personMapped;

  const designationCode = (options?.code ?? "").trim().toUpperCase();
  if (designationCode && DESIGNATION_BY_CODE[designationCode]) {
    return DESIGNATION_BY_CODE[designationCode];
  }

  const trimmed = (title ?? "").trim();
  if (!trimmed) {
    return options?.fallback ?? "Team Member";
  }

  const mapped = DESIGNATION_BY_TITLE[trimmed.toLowerCase()];
  if (mapped) return mapped;

  if (trimmed.toUpperCase() === "CEO") {
    return "Chief Executive Officer";
  }

  return trimmed;
}

export function normalizeEmployeeCode(code: string | null | undefined): string {
  return (code ?? "").trim().toUpperCase();
}
