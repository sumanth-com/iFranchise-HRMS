import type { LeavePolicyDocument, LeavePolicySection } from "@/types/leave-policy";

const PERIOD_LEAVE_PATTERN = /period\s+leave|menstruation\s+leave/i;

function stripPeriodLeaveLines(content: string): string {
  return content
    .split("\n")
    .filter((line) => !PERIOD_LEAVE_PATTERN.test(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function displayTitleForSection(section: LeavePolicySection, content: string): string | null {
  if (!content) return null;

  if (!PERIOD_LEAVE_PATTERN.test(section.title)) return section.title;

  return "Probation Leave Entitlement";
}

/** Employee-facing policy copy without Period Leave / Menstruation Leave (PL) clauses. */
export function hidePeriodLeaveFromPolicyDocument(
  document: LeavePolicyDocument,
): LeavePolicyDocument {
  const sections = document.sections.flatMap((section) => {
    const content = stripPeriodLeaveLines(section.content);
    const title = displayTitleForSection(section, content);
    if (!title) return [];
    return [{ ...section, title, content }];
  });

  return { ...document, sections };
}
